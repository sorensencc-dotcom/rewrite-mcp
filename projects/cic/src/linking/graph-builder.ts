/**
 * projects/cic/src/linking/graph-builder.ts
 * In-memory graph representation of documents, entities, internal relationships, and cross-document links.
 */

import { SemanticDocument, SemanticEntity, SemanticRelationship } from "../harvester/extractors/v2/extractor-v2.types.js";
import { CrossDocumentLink } from "./link-engine.js";

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
  private relationships: SemanticRelationship[] = [];
  private crossDocLinks: CrossDocumentLink[] = [];

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
        if (ent.context && !existing.context.includes(ent.context)) {
          existing.context += " " + ent.context;
        }
        existing.confidence = Math.max(existing.confidence, ent.confidence);
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

    // 3. Store relationships
    // Filter and add new relationships, avoiding duplicates
    const docRelationships = doc.relationships || [];
    for (const rel of docRelationships) {
      // Find standard resolved IDs if subject or object matches an entity name
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
          confidence: rel.confidence ?? 1.0
        });
      }
    }

    // 4. Store cross-document links
    for (const link of links) {
      const exists = this.crossDocLinks.some(l => l.id === link.id);
      if (!exists) {
        this.crossDocLinks.push(link);
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
