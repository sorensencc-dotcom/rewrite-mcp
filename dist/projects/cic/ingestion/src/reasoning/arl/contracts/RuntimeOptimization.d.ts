export interface ParallelizationStrategy {
    subsystems: string[];
    parallelizable: boolean;
    estimatedSpeedup: number;
}
export interface CacheEntry {
    key: string;
    value: unknown;
    timestamp: string;
    ttl: number;
}
export interface IncrementalDriftConfig {
    previousDrift: number;
    currentDrift: number;
    delta: number;
    useIncremental: boolean;
}
export interface ContradictionDetectionProfile {
    lightweight: boolean;
    precision: number;
    maxCandidates: number;
}
export interface RuntimeOptimization {
    id: string;
    timestamp: string;
    parallelization: ParallelizationStrategy;
    cacheStats: {
        hits: number;
        misses: number;
        hitRate: number;
    };
    incrementalDrift: IncrementalDriftConfig;
    contradictionProfile: ContradictionDetectionProfile;
    totalLatency: number;
    throughput: number;
}
//# sourceMappingURL=RuntimeOptimization.d.ts.map