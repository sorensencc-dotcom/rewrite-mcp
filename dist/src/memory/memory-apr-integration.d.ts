/**
 * Phase 23.4 — Memory-Aware APR (Autonomous Planner) Integration
 * Use memory to inform task planning and historical success rates
 */
import { MemoryLayer } from "./memory-integration";
export interface PlannerMemoryContext {
    historicalSuccessRates: Record<string, number>;
    failureClusters: Array<{
        category: string;
        frequency: number;
        recommendation: string;
    }>;
    recommendedApproaches: Array<{
        approach: string;
        successRate: number;
        confidenceScore: number;
    }>;
    riskFactors: string[];
}
export declare class APRMemoryIntegration {
    private memory;
    constructor(memory: MemoryLayer);
    /**
     * APR calls this when generating a plan to get historical context
     */
    getPlanningContext(): Promise<PlannerMemoryContext>;
    /**
     * APR calls this to estimate task duration based on history
     */
    estimateTaskDuration(taskType: "extraction" | "classification" | "synthesis", platform?: string): Promise<{
        estimatedMinutes: number;
        p95Minutes: number;
        confidence: number;
    }>;
    /**
     * APR uses this to bias task allocation toward high-confidence agents
     */
    getAgentRecommendations(): Promise<Array<{
        agentName: string;
        taskSuccessRate: number;
        recommendationScore: number;
        lastFailureTime?: string;
    }>>;
    private extractSuccessRates;
    private identifyFailureClusters;
    private recommendApproaches;
}
//# sourceMappingURL=memory-apr-integration.d.ts.map