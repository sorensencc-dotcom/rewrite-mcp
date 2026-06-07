import { describe, it, expect, beforeEach } from 'vitest';
import { StabilityPlaneEngine } from '../engine/StabilityPlaneEngine';
import { makeRunSeriesStable, makeRunSeriesDegrading } from './fixtures/RunSummaryFixtures';

describe('Batch 3, Phase 7.20: Stability Plane Engine', () => {
  let engine: StabilityPlaneEngine;

  beforeEach(() => {
    engine = new StabilityPlaneEngine();
  });

  describe('Stability plane generation', () => {
    it('should generate all required plane components', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(plane.driftVectorField).toBeDefined();
      expect(plane.compositeReasoningHeatmap).toBeDefined();
      expect(plane.confidenceTrajectory).toBeDefined();
      expect(plane.narrativeRiskRadar).toBeDefined();
      expect(plane.multiRunTrendLine).toBeDefined();
      expect(plane.overallStabilityScore).toBe(0.9);
    });
  });

  describe('Drift vector field', () => {
    it('should compute 3D drift vector', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(plane.driftVectorField.x).toBe(0.1);
      expect(plane.driftVectorField.y).toBe(0.055);
      expect(plane.driftVectorField.z).toBe(0.85);
      expect(plane.driftVectorField.magnitude).toBeGreaterThan(0);
    });
  });

  describe('Composite reasoning heatmap', () => {
    it('should generate grid-based heatmap', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(plane.compositeReasoningHeatmap.gridSize).toBe(10);
      expect(plane.compositeReasoningHeatmap.values).toHaveLength(10);
      expect(plane.compositeReasoningHeatmap.values[0]).toHaveLength(10);
    });

    it('should have valid heatmap bounds', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      plane.compositeReasoningHeatmap.values.forEach((row) => {
        row.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('Confidence trajectory', () => {
    it('should track confidence over time', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(plane.confidenceTrajectory.timestamps).toHaveLength(4);
      expect(plane.confidenceTrajectory.values).toHaveLength(4);
    });

    it('should detect trend in confidence trajectory', () => {
      const runs = makeRunSeriesDegrading();
      const aggregate = {
        rollingDriftAverage: 0.2125,
        rollingContradictionAverage: 0.1625,
        rollingSemanticAverage: 0.65,
        stabilityScore: 0.6,
        trend: 'DEGRADING' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(['increasing', 'decreasing', 'stable']).toContain(plane.confidenceTrajectory.trend);
    });
  });

  describe('Narrative risk radar', () => {
    it('should categorize risk levels', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(['low', 'medium', 'high']).toContain(plane.narrativeRiskRadar.riskLevel);
      expect(plane.narrativeRiskRadar.categories).toHaveLength(3);
      expect(plane.narrativeRiskRadar.values).toHaveLength(3);
    });

    it('should mark medium risk for moderately degrading runs', () => {
      const runs = makeRunSeriesDegrading();
      const aggregate = {
        rollingDriftAverage: 0.35,
        rollingContradictionAverage: 0.3,
        rollingSemanticAverage: 0.5,
        stabilityScore: 0.4,
        trend: 'DEGRADING' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(['medium', 'high']).toContain(plane.narrativeRiskRadar.riskLevel);
    });
  });

  describe('Multi-run trend line', () => {
    it('should track all trend dimensions', () => {
      const runs = makeRunSeriesStable();
      const aggregate = {
        rollingDriftAverage: 0.1,
        rollingContradictionAverage: 0.055,
        rollingSemanticAverage: 0.85,
        stabilityScore: 0.9,
        trend: 'STABLE' as const,
        runCount: 4,
      };

      const plane = engine.generatePlane(aggregate, runs);

      expect(plane.multiRunTrendLine.driftTrend).toHaveLength(4);
      expect(plane.multiRunTrendLine.contradictionTrend).toHaveLength(4);
      expect(plane.multiRunTrendLine.semanticTrend).toHaveLength(4);
    });
  });
});
