/**
 * apr-memory-integration.ts
 * Phase 23.4 — APR ↔ Memory Integration
 * Provides historical context and failure analysis for Autonomous Planner recommendations
 */
import { MemorySubstrate } from "../../../memory/memory-substrate";
export interface HistoricalContext {
    successRate: number;
    failureCount: number;
    failureClusters: Array<{
        pattern: string;
        count: number;
    }>;
    recommendedApproaches: string[];
    riskFactors: string[];
}
export declare class AprMemoryIntegration {
    private substrate;
    constructor(substrate: MemorySubstrate);
    /**
     * Analyze memory to extract historical planning context
     * Used by AutonomousPlanner to inform task recommendations
     */
    getHistoricalContext(): Promise<HistoricalContext>;
    /**
     * Extract memory-based skill recommendations
     * Which skills have succeeded most frequently in this context
     */
    getSkillRecommendations(): Promise<Array<{
        skillId: string;
        successRate: number;
        useCount: number;
    }>>;
    /**
     * Get task failure patterns to avoid
     */
    getFailurePatterns(): Promise<Array<{
        pattern: string;
        count: number;
        lastOccurrence: string;
    }>>;
}
//# sourceMappingURL=apr-memory-integration.d.ts.map