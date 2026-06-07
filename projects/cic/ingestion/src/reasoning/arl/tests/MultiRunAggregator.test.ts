import { describe, it, expect, beforeEach } from 'vitest';
import { MultiRunAggregator } from '../engine/MultiRunAggregator';
import {
  makeRunSeriesStable,
  makeRunSeriesDegrading,
  makeRunSeriesImproving,
  makeSingleRun,
} from './fixtures/RunSummaryFixtures';

describe('Batch 2, Phase 7.16: Multi-Run Aggregator', () => {
  let aggregator: MultiRunAggregator;

  beforeEach(() => {
    aggregator = new MultiRunAggregator();
  });

  describe('Rolling averages', () => {
    it('should compute correct drift average', () => {
      const runs = makeRunSeriesStable();

      const result = aggregator.aggregate(runs);

      const expectedDrift =
        (0.1 + 0.11 + 0.12 + 0.1) / 4;
      expect(result.rollingDriftAverage).toBeCloseTo(expectedDrift, 2);
    });

    it('should compute correct contradiction average', () => {
      const runs = makeRunSeriesStable();

      const result = aggregator.aggregate(runs);

      const expectedContradiction =
        (0.05 + 0.06 + 0.05 + 0.06) / 4;
      expect(result.rollingContradictionAverage).toBeCloseTo(
        expectedContradiction,
        2
      );
    });

    it('should compute correct semantic average', () => {
      const runs = makeRunSeriesStable();

      const result = aggregator.aggregate(runs);

      const expectedSemantic =
        (0.85 + 0.84 + 0.85 + 0.84) / 4;
      expect(result.rollingSemanticAverage).toBeCloseTo(expectedSemantic, 2);
    });

    it('should handle single run', () => {
      const singleRun = makeSingleRun();

      const result = aggregator.aggregate([singleRun]);

      expect(result.rollingDriftAverage).toBe(singleRun.driftScore);
      expect(result.rollingContradictionAverage).toBe(
        singleRun.contradictionScore
      );
      expect(result.rollingSemanticAverage).toBe(singleRun.semanticScore);
      expect(result.runCount).toBe(1);
    });

    it('should handle empty runs', () => {
      const result = aggregator.aggregate([]);

      expect(result.rollingDriftAverage).toBe(0);
      expect(result.rollingContradictionAverage).toBe(0);
      expect(result.rollingSemanticAverage).toBe(0);
      expect(result.runCount).toBe(0);
      expect(result.stabilityScore).toBe(1.0);
    });
  });

  describe('Trend detection', () => {
    it('should detect stable trend', () => {
      const runs = makeRunSeriesStable();

      const result = aggregator.aggregate(runs);

      expect(result.trend).toBe('STABLE');
    });

    it('should detect degrading trend', () => {
      const runs = makeRunSeriesDegrading();

      const result = aggregator.aggregate(runs);

      expect(result.trend).toBe('DEGRADING');
    });

    it('should detect improving trend', () => {
      const runs = makeRunSeriesImproving();

      const result = aggregator.aggregate(runs);

      expect(result.trend).toBe('IMPROVING');
    });
  });

  describe('Stability scoring', () => {
    it('should compute high stability for low drift', () => {
      const runs = makeRunSeriesStable();

      const result = aggregator.aggregate(runs);

      expect(result.stabilityScore).toBeGreaterThan(0.8);
    });

    it('should compute low stability for high drift', () => {
      const runs = makeRunSeriesDegrading();

      const result = aggregator.aggregate(runs);

      expect(result.stabilityScore).toBeLessThan(0.7);
    });
  });

  describe('Incremental append', () => {
    it('should maintain consistency between append and full recompute', () => {
      const runs = makeRunSeriesStable();

      const fullAggregate = aggregator.aggregate(runs);

      const initial = aggregator.aggregate(runs.slice(0, 2));
      const appended = aggregator.appendRun(initial, runs[2]);
      const appendedAgain = aggregator.appendRun(appended, runs[3]);

      expect(appendedAgain.rollingDriftAverage).toBeCloseTo(
        fullAggregate.rollingDriftAverage,
        3
      );
      expect(appendedAgain.rollingContradictionAverage).toBeCloseTo(
        fullAggregate.rollingContradictionAverage,
        3
      );
      expect(appendedAgain.rollingSemanticAverage).toBeCloseTo(
        fullAggregate.rollingSemanticAverage,
        3
      );
    });

    it('should handle first append correctly', () => {
      const initial = {
        rollingDriftAverage: 0,
        rollingContradictionAverage: 0,
        rollingSemanticAverage: 0,
        stabilityScore: 1.0,
        trend: 'STABLE' as const,
        runCount: 0,
      };

      const newRun = makeSingleRun();
      const result = aggregator.appendRun(initial, newRun);

      expect(result.runCount).toBe(1);
      expect(result.rollingDriftAverage).toBe(newRun.driftScore);
      expect(result.rollingContradictionAverage).toBe(
        newRun.contradictionScore
      );
    });

    it('should correctly average after multiple appends', () => {
      const runs = makeRunSeriesStable();

      let aggregate = aggregator.aggregate([]);
      for (const run of runs) {
        aggregate = aggregator.appendRun(aggregate, run);
      }

      const fullAggregate = aggregator.aggregate(runs);

      expect(aggregate.rollingDriftAverage).toBeCloseTo(
        fullAggregate.rollingDriftAverage,
        3
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle single-run series with trend detection', () => {
      const runs = [makeSingleRun()];

      const result = aggregator.aggregate(runs);

      expect(result.runCount).toBe(1);
      expect(result.trend).toBe('STABLE');
    });

    it('should handle two-run series for trend detection', () => {
      const runs = [
        {
          runId: 'run-1',
          timestamp: '2026-01-01T10:00:00Z',
          driftScore: 0.1,
          contradictionScore: 0.05,
          semanticScore: 0.85,
        },
        {
          runId: 'run-2',
          timestamp: '2026-01-01T11:00:00Z',
          driftScore: 0.2,
          contradictionScore: 0.1,
          semanticScore: 0.75,
        },
      ];

      const result = aggregator.aggregate(runs);

      expect(result.runCount).toBe(2);
      expect(['STABLE', 'DEGRADING', 'IMPROVING']).toContain(result.trend);
    });
  });
});
