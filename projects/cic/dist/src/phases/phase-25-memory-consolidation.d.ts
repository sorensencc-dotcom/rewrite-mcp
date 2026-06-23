export interface ConsolidatedKnowledgeObject {
    id: string;
    type: 'entity' | 'event' | 'location' | 'timeline';
    attributes: Record<string, any>;
    sources: string[];
    confidence: number;
    version: number;
    links: string[];
    stability: 'STABLE' | 'TENTATIVE' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
}
export interface KnowledgeGraphPatch {
    patch_id: string;
    nodes_added: any[];
    edges_added: Array<{
        from: string;
        to: string;
        type: string;
    }>;
    nodes_updated: any[];
    nodes_removed: string[];
    created_at: string;
}
export interface NormalizedMemoryEntry {
    id: string;
    type: string;
    payload: any;
    source: string;
    confidence: number;
    timestamp: string;
}
export interface Phase25Config {
    driftThreshold: number;
    minConfidenceStable: number;
    minCrossLinksStable: number;
    entityResolutionMethod: 'semantic' | 'similarity';
}
export declare class Phase25MemoryConsolidation {
    private ckoRegistry;
    private entityIndex;
    private config;
    constructor(config: Phase25Config);
    run(normalizedEntries: NormalizedMemoryEntry[]): {
        ckos: ConsolidatedKnowledgeObject[];
        kgp: KnowledgeGraphPatch;
    };
    private consolidate;
    private groupEntitiesBySimilarity;
    private determinativeMerge;
    private weightedAttributeFusion;
    private averageConfidence;
    private deduplicateAndGuardDrift;
    private semanticFingerprint;
    private calculateDrift;
    private crossLink;
    private shouldLink;
    private contextOverlap;
    private applyStabilityPass;
    private buildPatch;
}
