/**
 * projects/cic/src/linking/graph-builder.ts
 * In-memory and disk-backed graph representation of documents, entities, internal relationships, and cross-document links.
 */

import { SemanticDocument, SemanticEntity, SemanticRelationship } from "../harvester/extractors/v2/extractor-v2.types.js";
import { CrossDocumentLink } from "./link-engine.js";
import { canonicalizeName } from "./entity-resolver.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultGraphPath = path.resolve(__dirname, "../../data/graph-store.json");

export interface EntityNeighborhood {
  entity: SemanticEntity;
  documents: { docId: string; summary: string; timestamp: string }[];
  relationships: {
    targetEntityId: string;
    targetEntityName: string;
    predicate: string;
    confidence: number;
    details: string;
  }[];
}

export interface DocumentNeighborhood {
  document: Omit<SemanticDocument, "rawText">;
  entities: SemanticEntity[];
  relatedDocuments: {
    docId: string;
    type: string;
    confidence: number;
    details: string;
  }[];
}

export interface GraphSummary {
  nodes: {
    documents: number;
    entities: number;
    total: number;
  };
  edges: {
    entityRelationships: number;
    crossDocLinks: number;
    docEntityLinks: number;
    total: number;
  };
  topEntities: {
    entityId: string;
    name: string;
    type: string;
    degree: number;
  }[];
  health: {
    status: "green" | "yellow" | "red";
    details: string;
  };
}

export class GraphBuilder {
  private documents: Map<string, SemanticDocument> = new Map();
  private entities: Map<string, SemanticEntity> = new Map();
  private docEntityOccurrences: Map<string, Set<string>> = new Map(); // docId -> Set of entityIds
  private entityDocOccurrences: Map<string, Set<string>> = new Map(); // entityId -> Set of docIds
  private relationships: (SemanticRelationship & { timestamp?: string })[] = [];
  private crossDocLinks: (CrossDocumentLink & { timestamp?: string })[] = [];

  constructor() {
    if (typeof process !== "undefined" && !process.env.VITEST) {
      this.load();
    }
  }

  load(filePath: string = defaultGraphPath): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);

      this.clear();

      if (data.documents) {
        for (const [id, doc] of data.documents) {
          this.documents.set(id, doc);
        }
      }
      if (data.entities) {
        for (const [id, ent] of data.entities) {
          this.entities.set(id, ent);
        }
      }
      if (data.docEntityOccurrences) {
        for (const [id, arr] of data.docEntityOccurrences) {
          this.docEntityOccurrences.set(id, new Set(arr));
        }
      }
      if (data.entityDocOccurrences) {
        for (const [id, arr] of data.entityDocOccurrences) {
          this.entityDocOccurrences.set(id, new Set(arr));
        }
      }
      if (data.relationships) {
        this.relationships = data.relationships;
      }
      if (data.crossDocLinks) {
        this.crossDocLinks = data.crossDocLinks;
      }
    } catch (err: any) {
      console.error(`[GraphBuilder] Failed to load graph from ${filePath}:`, err.message);
    }
  }

  save(filePath: string = defaultGraphPath): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        documents: Array.from(this.documents.entries()),
        entities: Array.from(this.entities.entries()),
        docEntityOccurrences: Array.from(this.docEntityOccurrences.entries()).map(([k, v]) => [k, Array.from(v)]),
        entityDocOccurrences: Array.from(this.entityDocOccurrences.entries()).map(([k, v]) => [k, Array.from(v)]),
        relationships: this.relationships,
        crossDocLinks: this.crossDocLinks
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err: any) {
      console.error(`[GraphBuilder] Failed to save graph to ${filePath}:`, err.message);
    }
  }

  async createSnapshot(tag?: string): Promise<string> {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `graph_snapshot_${timestampStr}${tag ? "_" + tag : ""}.json`;
    const snapshotDir = path.resolve(__dirname, "../../data/snapshots");
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    const snapshotPath = path.join(snapshotDir, filename);
    this.save(snapshotPath);
    return snapshotPath;
  }

  sliceAtDate(dateXStr: string): {
    documents: SemanticDocument[];
    entities: SemanticEntity[];
    relationships: SemanticRelationship[];
    crossDocLinks: CrossDocumentLink[];
  } {
    const dateLimit = new Date(dateXStr).getTime();

    // 1. Filter documents with timestamp <= dateX
    const validDocs = Array.from(this.documents.values()).filter(doc => {
      return new Date(doc.timestamp).getTime() <= dateLimit;
    });
    const validDocIds = new Set(validDocs.map(d => d.docId));

    // 2. Filter entities: must have been created at or before dateX (i.e. first lineage entry <= dateX)
    const validEntities: SemanticEntity[] = [];
    for (const ent of this.entities.values()) {
      if (!ent.lineage || ent.lineage.length === 0) {
        // Fallback for legacy entities
        const occurrenceDocs = this.entityDocOccurrences.get(ent.id);
        if (occurrenceDocs) {
          const hasValidDoc = Array.from(occurrenceDocs).some(docId => validDocIds.has(docId));
          if (hasValidDoc) {
            validEntities.push({ ...ent });
          }
        }
        continue;
      }

      const validLineage = ent.lineage.filter(entry => {
        return new Date(entry.timestamp).getTime() <= dateLimit;
      });

      if (validLineage.length === 0) {
        continue; // Entity did not exist yet at dateX
      }

      // Reconstruct entity name and context at dateX by subtracting future actions
      let name = ent.name;
      let context = ent.context;

      const futureEvents = ent.lineage.filter(entry => {
        return new Date(entry.timestamp).getTime() > dateLimit;
      });

      if (futureEvents.length > 0) {
        // Find name before the first future update
        const sortedFuture = [...futureEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const firstFutureUpdate = sortedFuture.find(e => e.action === "name_updated");
        if (firstFutureUpdate && firstFutureUpdate.originalName) {
          name = firstFutureUpdate.originalName;
        }

        // Subtract future context additions
        for (const fEvent of futureEvents) {
          if (fEvent.action === "context_enriched" && fEvent.contextAdded) {
            context = context.replace(fEvent.contextAdded, "").replace(/\s+/g, " ").trim();
          }
        }
      }

      validEntities.push({
        id: ent.id,
        name,
        type: ent.type,
        context,
        confidence: ent.confidence,
        lineage: validLineage
      });
    }

    const validEntityIds = new Set(validEntities.map(e => e.id));

    // 3. Filter relationships: timestamp <= dateX AND both nodes are valid
    const validRelationships = this.relationships.filter(rel => {
      const ts = rel.timestamp ? new Date(rel.timestamp).getTime() : 0;
      const isTimeValid = ts <= dateLimit;
      return isTimeValid && validEntityIds.has(rel.subjectId) && validEntityIds.has(rel.objectId);
    }).map(({ timestamp, ...rest }) => rest as SemanticRelationship);

    // 4. Filter cross-document links: timestamp <= dateX AND both documents are valid
    const validLinks = this.crossDocLinks.filter(link => {
      const ts = link.timestamp ? new Date(link.timestamp).getTime() : 0;
      const isTimeValid = ts <= dateLimit;
      return isTimeValid && validDocIds.has(link.sourceDocId) && validDocIds.has(link.targetDocId);
    }).map(({ timestamp, ...rest }) => rest as CrossDocumentLink);

    return {
      documents: validDocs,
      entities: validEntities,
      relationships: validRelationships,
      crossDocLinks: validLinks
    };
  }

  addDocumentGraph(doc: SemanticDocument, links: CrossDocumentLink[]): void {
    if (!doc || !doc.docId) {
      throw new Error("Invalid document: docId is required");
    }

    // 1. Store the document
    this.documents.set(doc.docId, doc);

    // Initialize occurrence trackers
    if (!this.docEntityOccurrences.has(doc.docId)) {
      this.docEntityOccurrences.set(doc.docId, new Set());
    }

    // 2. Process and store resolved entities
    const docEntities = doc.entities || [];
    for (const ent of docEntities) {
      if (!ent.id) continue;

      // Merge or store entity metadata
      if (this.entities.has(ent.id)) {
        const existing = this.entities.get(ent.id)!;
        existing.name = ent.name;
        existing.context = ent.context;
        existing.confidence = Math.max(existing.confidence, ent.confidence);
        // Sync lineage if updated in resolver
        if (ent.lineage) {
          existing.lineage = ent.lineage;
        }
      } else {
        this.entities.set(ent.id, { ...ent });
      }

      // Record occurrence connections
      this.docEntityOccurrences.get(doc.docId)!.add(ent.id);

      if (!this.entityDocOccurrences.has(ent.id)) {
        this.entityDocOccurrences.set(ent.id, new Set());
      }
      this.entityDocOccurrences.get(ent.id)!.add(doc.docId);
    }

    // 3. Store relationships with ingestion timestamp
    const docRelationships = doc.relationships || [];
    for (const rel of docRelationships) {
      let subjectId = rel.subjectId || "";
      let objectId = rel.objectId || "";

      // Fallback: If IDs are missing, look them up by entity names in this document
      if (!subjectId && (rel as any).subject) {
        const sName = (rel as any).subject;
        const matched = docEntities.find(e => e.name === sName);
        if (matched) subjectId = matched.id;
      }
      if (!objectId && (rel as any).object) {
        const oName = (rel as any).object;
        const matched = docEntities.find(e => e.name === oName);
        if (matched) objectId = matched.id;
      }

      if (!subjectId || !objectId) continue;

      const exists = this.relationships.some(
        r => r.subjectId === subjectId && r.objectId === objectId && r.predicate === rel.predicate
      );

      if (!exists) {
        this.relationships.push({
          subjectId,
          objectId,
          predicate: rel.predicate,
          details: rel.details || "",
          confidence: rel.confidence ?? 1.0,
          timestamp: doc.timestamp || new Date().toISOString()
        });
      }
    }

    // 4. Store cross-document links with ingestion timestamp
    for (const link of links) {
      const exists = this.crossDocLinks.some(l => l.id === link.id);
      if (!exists) {
        this.crossDocLinks.push({
          ...link,
          timestamp: doc.timestamp || new Date().toISOString()
        });
      }
    }
  }

  getEntityNeighborhood(entityId: string): EntityNeighborhood {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity "${entityId}" not found in graph`);
    }

    // Connected documents
    const docIds = this.entityDocOccurrences.get(entityId) || new Set();
    const documents = Array.from(docIds).map(id => {
      const doc = this.documents.get(id)!;
      return {
        docId: doc.docId,
        summary: doc.summary,
        timestamp: doc.timestamp
      };
    });

    // Connected entities via relationships
    const rels: EntityNeighborhood["relationships"] = [];
    for (const rel of this.relationships) {
      if (rel.subjectId === entityId) {
        const target = this.entities.get(rel.objectId);
        if (target) {
          rels.push({
            targetEntityId: target.id,
            targetEntityName: target.name,
            predicate: rel.predicate,
            confidence: rel.confidence,
            details: rel.details
          });
        }
      } else if (rel.objectId === entityId) {
        const target = this.entities.get(rel.subjectId);
        if (target) {
          rels.push({
            targetEntityId: target.id,
            targetEntityName: target.name,
            predicate: `inverse_${rel.predicate}`,
            confidence: rel.confidence,
            details: rel.details
          });
        }
      }
    }

    return { entity, documents, relationships: rels };
  }

  getDocumentNeighborhood(docId: string): DocumentNeighborhood {
    const doc = this.documents.get(docId);
    if (!doc) {
      throw new Error(`Document "${docId}" not found in graph`);
    }

    const { rawText, ...docMeta } = doc;

    // Entities in this document
    const entityIds = this.docEntityOccurrences.get(docId) || new Set();
    const docEntities = Array.from(entityIds)
      .map(id => this.entities.get(id)!)
      .filter(Boolean);

    // Related documents via cross-document links
    const relatedDocs: DocumentNeighborhood["relatedDocuments"] = [];
    for (const link of this.crossDocLinks) {
      if (link.sourceDocId === docId) {
        relatedDocs.push({
          docId: link.targetDocId,
          type: link.type,
          confidence: link.confidence,
          details: link.details
        });
      } else if (link.targetDocId === docId) {
        relatedDocs.push({
          docId: link.sourceDocId,
          type: link.type,
          confidence: link.confidence,
          details: link.details
        });
      }
    }

    return {
      document: docMeta,
      entities: docEntities,
      relatedDocuments: relatedDocs
    };
  }

  getSummary(): GraphSummary {
    const docCount = this.documents.size;
    const entityCount = this.entities.size;
    
    let docEntityLinksCount = 0;
    this.docEntityOccurrences.forEach(ents => {
      docEntityLinksCount += ents.size;
    });

    const relCount = this.relationships.length;
    const linkCount = this.crossDocLinks.length;
    const totalEdges = relCount + linkCount + docEntityLinksCount;

    // Calculate degrees for top entities
    const entityDegrees = new Map<string, number>();
    
    // Add degree based on occurrences in documents
    this.entityDocOccurrences.forEach((docs, entId) => {
      entityDegrees.set(entId, (entityDegrees.get(entId) || 0) + docs.size);
    });

    // Add degree based on relationships
    for (const rel of this.relationships) {
      entityDegrees.set(rel.subjectId, (entityDegrees.get(rel.subjectId) || 0) + 1);
      entityDegrees.set(rel.objectId, (entityDegrees.get(rel.objectId) || 0) + 1);
    }

    const topEntities = Array.from(this.entities.values())
      .map(ent => ({
        entityId: ent.id,
        name: ent.name,
        type: ent.type,
        degree: entityDegrees.get(ent.id) || 0
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);

    const status = docCount > 0 ? "green" : "yellow";
    const details = `Graph initialized with ${docCount} documents and ${entityCount} entities.`;

    return {
      nodes: {
        documents: docCount,
        entities: entityCount,
        total: docCount + entityCount
      },
      edges: {
        entityRelationships: relCount,
        crossDocLinks: linkCount,
        docEntityLinks: docEntityLinksCount,
        total: totalEdges
      },
      topEntities,
      health: {
        status,
        details
      }
    };
  }

  clear(): void {
    this.documents.clear();
    this.entities.clear();
    this.docEntityOccurrences.clear();
    this.entityDocOccurrences.clear();
    this.relationships.length = 0;
    this.crossDocLinks.length = 0;
  }
}

export const graphBuilder = new GraphBuilder();
