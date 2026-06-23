"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const RuntimeOptimizationEngine_1 = require("../engine/RuntimeOptimizationEngine");
(0, vitest_1.describe)('Batch 3, Phase 7.21: Runtime Optimization Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new RuntimeOptimizationEngine_1.RuntimeOptimizationEngine();
    });
    (0, vitest_1.describe)('Optimization profile generation', () => {
        (0, vitest_1.it)('should generate complete optimization profile', () => {
            const profile = engine.optimize(50, 100, 25);
            (0, vitest_1.expect)(profile).toBeDefined();
            (0, vitest_1.expect)(profile.parallelization).toBeDefined();
            (0, vitest_1.expect)(profile.cacheStats).toBeDefined();
            (0, vitest_1.expect)(profile.incrementalDrift).toBeDefined();
            (0, vitest_1.expect)(profile.contradictionProfile).toBeDefined();
            (0, vitest_1.expect)(profile.totalLatency).toBeGreaterThan(0);
            (0, vitest_1.expect)(profile.throughput).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Parallelization strategy', () => {
        (0, vitest_1.it)('should recommend parallelization', () => {
            const profile = engine.optimize();
            (0, vitest_1.expect)(profile.parallelization.parallelizable).toBe(true);
            (0, vitest_1.expect)(profile.parallelization.subsystems).toHaveLength(5);
            (0, vitest_1.expect)(profile.parallelization.estimatedSpeedup).toBeGreaterThan(1);
        });
        (0, vitest_1.it)('should list all subsystems as parallelizable', () => {
            const profile = engine.optimize();
            const expectedSubsystems = ['coherence', 'semantic', 'temporal', 'causal', 'narrative'];
            (0, vitest_1.expect)(profile.parallelization.subsystems).toEqual(expectedSubsystems);
        });
    });
    (0, vitest_1.describe)('Cache statistics', () => {
        (0, vitest_1.it)('should compute cache hit rate', () => {
            const profile = engine.optimize(100, 80, 20);
            (0, vitest_1.expect)(profile.cacheStats.hits).toBe(80);
            (0, vitest_1.expect)(profile.cacheStats.misses).toBe(20);
            (0, vitest_1.expect)(profile.cacheStats.hitRate).toBeCloseTo(0.8, 2);
        });
        (0, vitest_1.it)('should handle empty cache stats', () => {
            const profile = engine.optimize(100, 0, 0);
            (0, vitest_1.expect)(profile.cacheStats.hitRate).toBe(0);
        });
    });
    (0, vitest_1.describe)('Incremental drift computation', () => {
        (0, vitest_1.it)('should detect when incremental computation is applicable', () => {
            const profile = engine.optimize(45, 100, 25);
            (0, vitest_1.expect)(profile.incrementalDrift.useIncremental).toBe(true);
        });
        (0, vitest_1.it)('should compute drift delta', () => {
            const profile = engine.optimize(50);
            (0, vitest_1.expect)(profile.incrementalDrift.delta).toBeDefined();
            (0, vitest_1.expect)(Math.abs(profile.incrementalDrift.delta)).toBeLessThan(1);
        });
    });
    (0, vitest_1.describe)('Contradiction detection profile', () => {
        (0, vitest_1.it)('should use lightweight contradiction detection', () => {
            const profile = engine.optimize();
            (0, vitest_1.expect)(profile.contradictionProfile.lightweight).toBe(true);
            (0, vitest_1.expect)(profile.contradictionProfile.precision).toBeGreaterThan(0.8);
            (0, vitest_1.expect)(profile.contradictionProfile.maxCandidates).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Performance metrics', () => {
        (0, vitest_1.it)('should compute latency correctly', () => {
            const latency = 75;
            const profile = engine.optimize(latency);
            (0, vitest_1.expect)(profile.totalLatency).toBe(latency);
        });
        (0, vitest_1.it)('should compute throughput from latency', () => {
            const latency = 50;
            const profile = engine.optimize(latency);
            const expectedThroughput = 1000 / latency;
            (0, vitest_1.expect)(profile.throughput).toBeCloseTo(expectedThroughput, 1);
        });
        (0, vitest_1.it)('should show improvement with default latency', () => {
            const profile = engine.optimize();
            (0, vitest_1.expect)(profile.throughput).toBeGreaterThan(0);
            (0, vitest_1.expect)(profile.totalLatency).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Optimization consistency', () => {
        (0, vitest_1.it)('should maintain consistent profile structure across calls', () => {
            const profile1 = engine.optimize(100, 50, 50);
            const profile2 = engine.optimize(100, 50, 50);
            (0, vitest_1.expect)(profile1.parallelization.parallelizable).toBe(profile2.parallelization.parallelizable);
            (0, vitest_1.expect)(profile1.contradictionProfile.lightweight).toBe(profile2.contradictionProfile.lightweight);
        });
    });
});
//# sourceMappingURL=RuntimeOptimizationEngine.test.js.map