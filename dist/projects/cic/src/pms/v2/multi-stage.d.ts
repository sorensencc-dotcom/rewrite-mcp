/**
 * projects/cic/src/pms/v2/multi-stage.ts
 * Multi-stage prompt generation orchestrator with in-memory caching.
 */
export type StageType = "seed" | "refine" | "summarize";
export interface MultiStageResult {
    prompt: string;
    metadata: {
        templateId: string;
        stage: StageType;
        cached: boolean;
        resolvedVariables: Record<string, any>;
        error: string | null;
        [key: string]: any;
    };
}
export declare class MultiStageOrchestrator {
    private cache;
    /**
     * Orchestrates prompt requests for seed, refine, and summarize stages.
     * Leverages caching to optimize repeat compositions.
     */
    requestPrompt(stage: StageType, context: any): Promise<MultiStageResult>;
    /**
     * Clear the orchestrator cache
     */
    clearCache(): void;
    private mapStageToTemplate;
    private buildStageVariables;
    private generateCacheKey;
}
export declare const multiStageOrchestrator: MultiStageOrchestrator;
//# sourceMappingURL=multi-stage.d.ts.map