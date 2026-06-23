/**
 * projects/cic/src/reasoning/reason-trace.ts
 * Manages auditing, serialization, loading, and structural checking of reasoning traces.
 */
import { RetrievalPlan } from "./retrieval-planner.js";
export interface Contradiction {
    claimA: string;
    claimB: string;
    severity: "high" | "low";
    evidenceIds: string[];
}
export interface ReasonTrace {
    traceId: string;
    query: string;
    plan: RetrievalPlan;
    evidenceEvaluated: {
        evidenceId: string;
        type: string;
        score: number;
        action: "used" | "discarded";
        reason: string;
    }[];
    contradictionsDetected: Contradiction[];
    stageLatenciesMs: Record<string, number>;
    finalAnswer: string;
    confidence: "high" | "medium" | "low";
    isContested: boolean;
    timestamp: string;
}
export declare class ReasonTraceManager {
    save(trace: ReasonTrace, dirPath?: string): string;
    load(traceId: string, dirPath?: string): ReasonTrace | null;
    listTraces(dirPath?: string): string[];
}
export declare const reasonTraceManager: ReasonTraceManager;
//# sourceMappingURL=reason-trace.d.ts.map