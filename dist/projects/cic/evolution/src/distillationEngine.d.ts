import { CkgStore, CkgGraph } from "../../src/ckg/ckg-store.js";
export interface PruneCandidate {
    nodeId: string;
    type: string;
    action: "delete" | "merge";
    reason: string;
    mergeTargetId?: string;
}
export interface DistillationReport {
    timestamp: number;
    metrics: {
        originalNodesCount: number;
        originalEdgesCount: number;
        staleNodesFound: number;
        redundantNodesFound: number;
        estimatedCompressionRatio: number;
    };
}
export declare class KnowledgeDistillationEngine {
    private readonly store;
    constructor(store: CkgStore);
    runDistillation(stalenessThresholdMs?: number): {
        report: DistillationReport;
        candidates: PruneCandidate[];
        compressedGraph: CkgGraph;
    };
}
//# sourceMappingURL=distillationEngine.d.ts.map