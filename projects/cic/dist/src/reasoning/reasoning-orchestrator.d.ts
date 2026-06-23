/**
 * projects/cic/src/reasoning/reasoning-orchestrator.ts
 * Coordinates the Retrieval-Augmented Reasoning (RAG) loops and contradiction checks.
 */
import { ReasonTrace } from "./reason-trace.js";
export declare class ReasoningOrchestrator {
    reason(query: string, context?: {
        timeWindow?: string;
        maxDocuments?: number;
        maxTokens?: number;
    }): Promise<ReasonTrace>;
    private detectContradictions;
    private resolvePMSTemplate;
    private simulateFinalSynthesis;
}
export declare const reasoningOrchestrator: ReasoningOrchestrator;
