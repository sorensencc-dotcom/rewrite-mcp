/**
 * Phase 23.4 — Memory-Aware ARPS Integration
 * Wire memory summaries into ARPS (Autonomous Roadmap & Prompt Synthesizer)
 */
import { MemoryLayer } from "./memory-integration";
import { MonthlySummary } from "./memory-synthesizer";
export interface ARPSMemoryContext {
    monthSummary: MonthlySummary;
    recentFailures: Array<{
        platform: string;
        errorRate: number;
        recommendation: string;
    }>;
    successPatterns: Array<{
        pattern: string;
        frequency: number;
        confidence: number;
    }>;
    driftIndicators: string[];
    proposalsForRoadmap: Array<{
        phase?: string;
        title: string;
        rationale: string;
        estimatedEffort: number;
    }>;
}
export declare class ARPSMemoryIntegration {
    private memory;
    constructor(memory: MemoryLayer);
    /**
     * ARPS calls this before generating next prompt/roadmap
     * Returns memory context to inform roadmap synthesis
     */
    getMemoryContextForPromptGeneration(): Promise<ARPSMemoryContext>;
    /**
     * ARPS uses this to bias roadmap updates toward stable patterns
     */
    getTrendAnalysis(): Promise<{
        direction: "improving" | "degrading" | "stable";
        confidence: number;
        recommendation: string;
    }>;
    private extractFailurePatterns;
    private extractSuccessPatterns;
    private suggestPhaseNumber;
    private getTrendRecommendation;
}
//# sourceMappingURL=memory-arps-integration.d.ts.map