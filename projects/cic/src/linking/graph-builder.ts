// File: projects/cic/src/linking/graph-builder.ts | Date: 2026-05-30 | v1.4.0
/**
 * In-memory persistent graph database builder.
 * Supports date-based playback and temporal slicing.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */

import { SemanticDocument, SemanticEntity, SemanticRelationship } from "../harvester/extractors/v2/extractor-v2.types.js";
import { CrossDocumentLink } from "./link-engine.js";
import { canonicalizeName } from "./entity-resolver.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { metricsCollector } from "../reasoning/metrics-collector.js";

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
  // Scoped structures: tenantId -> Map/Array
  private tenantDocuments: Map<string, Map<string, SemanticDocument>> = new Map();
  private tenantEntities: Map<string, Map<string, SemanticEntity>> = new Map();
  private tenantDocEntityOccurrences: Map<string, Map<string, Set<string>>> = new Map();
  private tenantEntityDocOccurrences: Map<string, Map<string, Set<string>>> = new Map();
  private tenantRelationships: Map<string, (SemanticRelationship & { timestamp?: string })[]> = new Map();
  private tenantCrossDocLinks: Map<string, (CrossDocumentLink & { timestamp?: string })[]> = new Map();

  constructor() {
    if (typeof process !== "undefined" && !process.env.VITEST) {
      this.load(undefined, "default");
    }
  }

  // Scoped getters
  private getDocuments(tenantId: string): Map<string, SemanticDocument> {
    if (!this.tenantDocuments.has(tenantId)) {
      this.tenantDocuments.set(tenantId, new Map());
    }
    return this.tenantDocuments.get(tenantId)!;
  }

  private getEntities(tenantId: string): Map<string, SemanticEntity> {
    if (!this.tenantEntities.has(tenantId)) {
      this.tenantEntities.set(tenantId, new Map());
    }
    return this.tenantEntities.get(tenantId)!;
  }

  private getDocEntityOccurrences(tenantId: string): Map<string, Set<string>> {
    if (!this.tenantDocEntityOccurrences.has(tenantId)) {
      this.tenantDocEntityOccurrences.set(tenantId, new Map());
    }
    return this.tenantDocEntityOccurrences.get(tenantId)!;
  }

  private getEntityDocOccurrences(tenantId: string): Map<string, Set<string>> {
    if (!this.tenantEntityDocOccurrences.has(tenantId)) {
      this.tenantEntityDocOccurrences.set(tenantId, new Map());
    }
    return this.tenantEntityDocOccurrences.get(tenantId)!;
  }

  private getRelationships(tenantId: string): (SemanticRelationship & { timestamp?: string })[] {
    if (!this.tenantRelationships.has(tenantId)) {
      this.tenantRelationships.set(tenantId, []);
    }
    return this.tenantRelationships.get(tenantId)!;
  }

  private getCrossDocLinks(tenantId: string): (CrossDocumentLink & { timestamp?: string })[] {
    if (!this.tenantCrossDocLinks.has(tenantId)) {
      this.tenantCrossDocLinks.set(tenantId, []);
    }
    return this.tenantCrossDocLinks.get(tenantId)!;
  }

  private getTenantPath(filePath: string | undefined, tenantId: string): string {
    if (filePath) return filePath;
    if (tenantId === "default") return defaultGraphPath;
    return path.resolve(__dirname, `../../data/tenants/${tenantId}/graph-store.json`);
  }

  load(filePath?: string, tenantId: string = "default"): void {
    const tStart = Date.now();
    const targetPath = this.getTenantPath(filePath, tenantId);
    try {
      if (!fs.existsSync(targetPath)) {
        return;
      }
      const raw = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(raw);

      this.clear(tenantId);

      const docs = this.getDocuments(tenantId);
      const ents = this.getEntities(tenantId);
      const docOcc = this.getDocEntityOccurrences(tenantId);
      const entOcc = this.getEntityDocOccurrences(tenantId);
      const rels = this.getRelationships(tenantId);
      const links = this.getCrossDocLinks(tenantId);

      if (data.documents) {
        for (const [id, doc] of data.documents) {
          docs.set(id, doc);
        }
      }
      if (data.entities) {
        for (const [id, ent] of data.entities) {
          ents.set(id, ent);
        }
      }
      if (data.docEntityOccurrences) {
        for (const [id, arr] of data.docEntityOccurrences) {
          docOcc.set(id, new Set(arr));
        }
      }
      if (data.entityDocOccurrences) {
        for (const [id, arr] of data.entityDocOccurrences) {
          entOcc.set(id, new Set(arr));
        }
      }
      if (data.relationships) {
        rels.push(...data.relationships);
      }
      if (data.crossDocLinks) {
        links.push(...data.crossDocLinks);
      }
      metricsCollector.recordGraphLoad(Date.now() - tStart);
    } catch (err: any) {
      console.error(`[GraphBuilder] Failed to load graph for tenant '${tenantId}' from ${targetPath}:`, err.message);
    }
  }

  save(filePath?: string, tenantId: string = "default"): void {
    const targetPath = this.getTenantPath(filePath, tenantId);
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const docs = this.getDocuments(tenantId);
      const ents = this.getEntities(tenantId);
      const docOcc = this.getDocEntityOccurrences(tenantId);
      const entOcc = this.getEntityDocOccurrences(tenantId);
      const rels = this.getRelationships(tenantId);
      const links = this.getCrossDocLinks(tenantId);

      const data = {
        documents: Array.from(docs.entries()),
        entities: Array.from(ents.entries()),
        docEntityOccurrences: Array.from(docOcc.entries()).map(([k, v]) => [k, Array.from(v)]),
        entityDocOccurrences: Array.from(entOcc.entries()).map(([k, v]) => [k, Array.from(v)]),
        relationships: rels,
        crossDocLinks: links
      };

      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err: any) {
      console.error(`[GraphBuilder] Failed to save graph for tenant '${tenantId}' to ${targetPath}:`, err.message);
    }
  }

  async createSnapshot(tag?: string, tenantId: string = "default"): Promise<string> {
    const tStart = Date.now();
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `graph_snapshot_${timestampStr}${tag ? "_" + tag : ""}.json`;
    
    const snapshotDir = tenantId === "default"
      ? path.resolve(__dirname, "../../data/snapshots")
      : path.resolve(__dirname, `../../data/tenants/${tenantId}/snapshots`);

    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    const snapshotPath = path.join(snapshotDir, filename);
    this.save(snapshotPath, tenantId);
    
    try {
      const duration = Date.now() - tStart;
      const sizeBytes = fs.existsSync(snapshotPath) ? fs.statSync(snapshotPath).size : 0;
      metricsCollector.recordGraphSnapshot(tag || "manual", sizeBytes, duration);
    } catch {
      // ignore
    }

    return snapshotPath;
  }

  sliceAtDate(
    dateXStr: string,
    tenantId: string = "default"
  ): {
    documents: SemanticDocument[];
    entities: SemanticEntity[];
    relationships: SemanticRelationship[];
    crossDocLinks: CrossDocumentLink[];
  } {
    const dateLimit = new Date(dateXStr).getTime();
    const docs = this.getDocuments(tenantId);
    const entities = this.getEntities(tenantId);
    const entityDocOccurrences = this.getEntityDocOccurrences(tenantId);
    const relationships = this.getRelationships(tenantId);
    const crossDocLinks = this.getCrossDocLinks(tenantId);

    // 1. Filter documents with timestamp <= dateX
    const validDocs = Array.from(docs.values()).filter(doc => {
      return new Date(doc.timestamp).getTime() <= dateLimit;
    });
    const validDocIds = new Set(validDocs.map(d => d.docId));

    // 2. Filter entities: must have been created at or before dateX (i.e. first lineage entry <= dateX)
    const validEntities: SemanticEntity[] = [];
    for (const ent of entities.values()) {
      if (!ent.lineage || ent.lineage.length === 0) {
        // Fallback for legacy entities
        const occurrenceDocs = entityDocOccurrences.get(ent.id);
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
    const validRelationships = relationships.filter(rel => {
      const ts = rel.timestamp ? new Date(rel.timestamp).getTime() : 0;
      const isTimeValid = ts <= dateLimit;
      return isTimeValid && validEntityIds.has(rel.subjectId) && validEntityIds.has(rel.objectId);
    }).map(({ timestamp, ...rest }) => rest as SemanticRelationship);

    // 4. Filter cross-document links: timestamp <= dateX AND both documents are valid
    const validLinks = crossDocLinks.filter(link => {
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

  addDocumentGraph(
    doc: SemanticDocument,
    links: CrossDocumentLink[],
    tenantId: string = "default"
  ): void {
    if (!doc || !doc.docId) {
      throw new Error("Invalid document: docId is required");
    }

    const docs = this.getDocuments(tenantId);
    const entities = this.getEntities(tenantId);
    const docEntityOccurrences = this.getDocEntityOccurrences(tenantId);
    const entityDocOccurrences = this.getEntityDocOccurrences(tenantId);
    const relationships = this.getRelationships(tenantId);
    const crossDocLinks = this.getCrossDocLinks(tenantId);

    // 1. Store the document
    docs.set(doc.docId, doc);

    // Initialize occurrence trackers
    if (!docEntityOccurrences.has(doc.docId)) {
      docEntityOccurrences.set(doc.docId, new Set());
    }

    // 2. Process and store resolved entities
    const docEntities = doc.entities || [];
    for (const ent of docEntities) {
      if (!ent.id) continue;

      // Merge or store entity metadata
      if (entities.has(ent.id)) {
        const existing = entities.get(ent.id)!;
        existing.name = ent.name;
        existing.context = ent.context;
        existing.confidence = Math.max(existing.confidence, ent.confidence);
        // Sync lineage if updated in resolver
        if (ent.lineage) {
          existing.lineage = ent.lineage;
        }
      } else {
        entities.set(ent.id, { ...ent });
      }

      // Record occurrence connections
      docEntityOccurrences.get(doc.docId)!.add(ent.id);

      if (!entityDocOccurrences.has(ent.id)) {
        entityDocOccurrences.set(ent.id, new Set());
      }
      entityDocOccurrences.get(ent.id)!.add(doc.docId);
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

      const exists = relationships.some(
        r => r.subjectId === subjectId && r.objectId === objectId && r.predicate === rel.predicate
      );

      if (!exists) {
        relationships.push({
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
      const exists = crossDocLinks.some(l => l.id === link.id);
      if (!exists) {
        crossDocLinks.push({
          ...link,
          timestamp: doc.timestamp || new Date().toISOString()
        });
      }
    }
  }

  getEntityNeighborhood(entityId: string, tenantId: string = "default"): EntityNeighborhood {
    const entities = this.getEntities(tenantId);
    const documents = this.getDocuments(tenantId);
    const entityDocOccurrences = this.getEntityDocOccurrences(tenantId);
    const relationships = this.getRelationships(tenantId);

    const entity = entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity "${entityId}" not found in graph`);
    }

    // Connected documents
    const docIds = entityDocOccurrences.get(entityId) || new Set();
    const docsList = Array.from(docIds).map(id => {
      const doc = documents.get(id)!;
      return {
        docId: doc.docId,
        summary: doc.summary,
        timestamp: doc.timestamp
      };
    });

    // Connected entities via relationships
    const rels: EntityNeighborhood["relationships"] = [];
    for (const rel of relationships) {
      if (rel.subjectId === entityId) {
        const target = entities.get(rel.objectId);
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
        const target = entities.get(rel.subjectId);
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

    return { entity, documents: docsList, relationships: rels };
  }

  getDocumentNeighborhood(docId: string, tenantId: string = "default"): DocumentNeighborhood {
    const documents = this.getDocuments(tenantId);
    const entities = this.getEntities(tenantId);
    const docEntityOccurrences = this.getDocEntityOccurrences(tenantId);
    const crossDocLinks = this.getCrossDocLinks(tenantId);

    const doc = documents.get(docId);
    if (!doc) {
      throw new Error(`Document "${docId}" not found in graph`);
    }

    const { rawText, ...docMeta } = doc;

    // Entities in this document
    const entityIds = docEntityOccurrences.get(docId) || new Set();
    const docEntities = Array.from(entityIds)
      .map(id => entities.get(id)!)
      .filter(Boolean);

    // Related documents via cross-document links
    const relatedDocs: DocumentNeighborhood["relatedDocuments"] = [];
    for (const link of crossDocLinks) {
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

  getSummary(tenantId: string = "default"): GraphSummary {
    const docs = this.getDocuments(tenantId);
    const entities = this.getEntities(tenantId);
    const docEntityOccurrences = this.getDocEntityOccurrences(tenantId);
    const entityDocOccurrences = this.getEntityDocOccurrences(tenantId);
    const relationships = this.getRelationships(tenantId);
    const crossDocLinks = this.getCrossDocLinks(tenantId);

    const docCount = docs.size;
    const entityCount = entities.size;
    
    let docEntityLinksCount = 0;
    docEntityOccurrences.forEach(ents => {
      docEntityLinksCount += ents.size;
    });

    const relCount = relationships.length;
    const linkCount = crossDocLinks.length;
    const totalEdges = relCount + linkCount + docEntityLinksCount;

    // Calculate degrees for top entities
    const entityDegrees = new Map<string, number>();
    
    // Add degree based on occurrences in documents
    entityDocOccurrences.forEach((docs, entId) => {
      entityDegrees.set(entId, (entityDegrees.get(entId) || 0) + docs.size);
    });

    // Add degree based on relationships
    for (const rel of relationships) {
      entityDegrees.set(rel.subjectId, (entityDegrees.get(rel.subjectId) || 0) + 1);
      entityDegrees.set(rel.objectId, (entityDegrees.get(rel.objectId) || 0) + 1);
    }

    const topEntities = Array.from(entities.values())
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

  clear(tenantId: string = "default"): void {
    this.getDocuments(tenantId).clear();
    this.getEntities(tenantId).clear();
    this.getDocEntityOccurrences(tenantId).clear();
    this.getEntityDocOccurrences(tenantId).clear();
    
    if (this.tenantRelationships.has(tenantId)) {
      this.tenantRelationships.get(tenantId)!.length = 0;
    }
    if (this.tenantCrossDocLinks.has(tenantId)) {
      this.tenantCrossDocLinks.get(tenantId)!.length = 0;
    }
  }
}

export const graphBuilder = new GraphBuilder();
