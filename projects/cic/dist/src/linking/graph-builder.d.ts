/**
 * In-memory persistent graph database builder.
 * Supports date-based playback and temporal slicing.
 * Scoped by tenant for Multi-Tenant Knowledge Fabric.
 */
import { SemanticDocument, SemanticEntity, SemanticRelationship } from "../harvester/extractors/v2/extractor-v2.types.js";
import { CrossDocumentLink } from "./link-engine.js";
export interface EntityNeighborhood {
    entity: SemanticEntity;
    documents: {
        docId: string;
        summary: string;
        timestamp: string;
    }[];
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
export declare class GraphBuilder {
    private tenantDocuments;
    private tenantEntities;
    private tenantDocEntityOccurrences;
    private tenantEntityDocOccurrences;
    private tenantRelationships;
    private tenantCrossDocLinks;
    constructor();
    private getDocuments;
    private getEntities;
    private getDocEntityOccurrences;
    private getEntityDocOccurrences;
    private getRelationships;
    private getCrossDocLinks;
    private getTenantPath;
    load(filePath?: string, tenantId?: string): void;
    save(filePath?: string, tenantId?: string): void;
    createSnapshot(tag?: string, tenantId?: string): Promise<string>;
    sliceAtDate(dateXStr: string, tenantId?: string): {
        documents: SemanticDocument[];
        entities: SemanticEntity[];
        relationships: SemanticRelationship[];
        crossDocLinks: CrossDocumentLink[];
    };
    addDocumentGraph(doc: SemanticDocument, links: CrossDocumentLink[], tenantId?: string): void;
    getEntityNeighborhood(entityId: string, tenantId?: string): EntityNeighborhood;
    getDocumentNeighborhood(docId: string, tenantId?: string): DocumentNeighborhood;
    getSummary(tenantId?: string): GraphSummary;
    clear(tenantId?: string): void;
}
export declare const graphBuilder: GraphBuilder;
