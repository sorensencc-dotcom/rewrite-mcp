import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeOptimizationEngine } from '../engine/RuntimeOptimizationEngine';

describe('Batch 3, Phase 7.21: Runtime Optimization Engine', () => {
  let engine: RuntimeOptimizationEngine;

  beforeEach(() => {
    engine = new RuntimeOptimizationEngine();
  });

  describe('Optimization profile generation', () => {
    it('should generate complete optimization profile', () => {
      const profile = engine.optimize(50, 100, 25);

      expect(profile).toBeDefined();
      expect(profile.parallelization).toBeDefined();
      expect(profile.cacheStats).toBeDefined();
      expect(profile.incrementalDrift).toBeDefined();
      expect(profile.contradictionProfile).toBeDefined();
      expect(profile.totalLatency).toBeGreaterThan(0);
      expect(profile.throughput).toBeGreaterThan(0);
    });
  });

  describe('Parallelization strategy', () => {
    it('should recommend parallelization', () => {
      const profile = engine.optimize();

      expect(profile.parallelization.parallelizable).toBe(true);
      expect(profile.parallelization.subsystems).toHaveLength(5);
      expect(profile.parallelization.estimatedSpeedup).toBeGreaterThan(1);
    });

    it('should list all subsystems as parallelizable', () => {
      const profile = engine.optimize();

      const expectedSubsystems = ['coherence', 'semantic', 'temporal', 'causal', 'narrative'];
      expect(profile.parallelization.subsystems).toEqual(expectedSubsystems);
    });
  });

  describe('Cache statistics', () => {
    it('should compute cache hit rate', () => {
      const profile = engine.optimize(100, 80, 20);

      expect(profile.cacheStats.hits).toBe(80);
      expect(profile.cacheStats.misses).toBe(20);
      expect(profile.cacheStats.hitRate).toBeCloseTo(0.8, 2);
    });

    it('should handle empty cache stats', () => {
      const profile = engine.optimize(100, 0, 0);

      expect(profile.cacheStats.hitRate).toBe(0);
    });
  });

  describe('Incremental drift computation', () => {
    it('should detect when incremental computation is applicable', () => {
      const profile = engine.optimize(45, 100, 25);

      expect(profile.incrementalDrift.useIncremental).toBe(true);
    });

    it('should compute drift delta', () => {
      const profile = engine.optimize(50);

      expect(profile.incrementalDrift.delta).toBeDefined();
      expect(Math.abs(profile.incrementalDrift.delta)).toBeLessThan(1);
    });
  });

  describe('Contradiction detection profile', () => {
    it('should use lightweight contradiction detection', () => {
      const profile = engine.optimize();

      expect(profile.contradictionProfile.lightweight).toBe(true);
      expect(profile.contradictionProfile.precision).toBeGreaterThan(0.8);
      expect(profile.contradictionProfile.maxCandidates).toBeGreaterThan(0);
    });
  });

  describe('Performance metrics', () => {
    it('should compute latency correctly', () => {
      const latency = 75;
      const profile = engine.optimize(latency);

      expect(profile.totalLatency).toBe(latency);
    });

    it('should compute throughput from latency', () => {
      const latency = 50;
      const profile = engine.optimize(latency);

      const expectedThroughput = 1000 / latency;
      expect(profile.throughput).toBeCloseTo(expectedThroughput, 1);
    });

    it('should show improvement with default latency', () => {
      const profile = engine.optimize();

      expect(profile.throughput).toBeGreaterThan(0);
      expect(profile.totalLatency).toBeGreaterThan(0);
    });
  });

  describe('Optimization consistency', () => {
    it('should maintain consistent profile structure across calls', () => {
      const profile1 = engine.optimize(100, 50, 50);
      const profile2 = engine.optimize(100, 50, 50);

      expect(profile1.parallelization.parallelizable).toBe(
        profile2.parallelization.parallelizable
      );
      expect(profile1.contradictionProfile.lightweight).toBe(
        profile2.contradictionProfile.lightweight
      );
    });
  });
});
