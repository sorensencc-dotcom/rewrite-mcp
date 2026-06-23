import { RuntimeOptimization } from '../contracts/RuntimeOptimization';
export declare class RuntimeOptimizationEngine {
    optimize(previousLatency?: number, cacheHits?: number, cacheMisses?: number): RuntimeOptimization;
    private computeParallelizationStrategy;
    private computeCacheStats;
    private computeIncrementalDriftConfig;
    private computeContradictionDetectionProfile;
    private computeThroughput;
}
//# sourceMappingURL=RuntimeOptimizationEngine.d.ts.map