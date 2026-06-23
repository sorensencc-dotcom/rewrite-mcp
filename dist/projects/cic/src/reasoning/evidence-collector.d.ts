/**
 * projects/cic/src/reasoning/evidence-collector.ts
 * Executes retrieval plans by querying vector indexes and traversing historical graph slices.
 */
import { RetrievalPlan } from "./retrieval-planner.js";
export interface RankedEvidence {
    id: string;
    type: "document" | "entity" | "relationship";
    score: number;
    text: string;
    provenance: string;
    timestamp: string;
}
export declare class EvidenceCollector {
    private vectorIndex;
    constructor();
    collect(plan: RetrievalPlan): Promise<RankedEvidence[]>;
}
export declare const evidenceCollector: EvidenceCollector;
//# sourceMappingURL=evidence-collector.d.ts.map