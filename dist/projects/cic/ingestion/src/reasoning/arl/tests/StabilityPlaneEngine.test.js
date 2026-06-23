"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const StabilityPlaneEngine_1 = require("../engine/StabilityPlaneEngine");
const RunSummaryFixtures_1 = require("./fixtures/RunSummaryFixtures");
(0, vitest_1.describe)('Batch 3, Phase 7.20: Stability Plane Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new StabilityPlaneEngine_1.StabilityPlaneEngine();
    });
    (0, vitest_1.describe)('Stability plane generation', () => {
        (0, vitest_1.it)('should generate all required plane components', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(plane.driftVectorField).toBeDefined();
            (0, vitest_1.expect)(plane.compositeReasoningHeatmap).toBeDefined();
            (0, vitest_1.expect)(plane.confidenceTrajectory).toBeDefined();
            (0, vitest_1.expect)(plane.narrativeRiskRadar).toBeDefined();
            (0, vitest_1.expect)(plane.multiRunTrendLine).toBeDefined();
            (0, vitest_1.expect)(plane.overallStabilityScore).toBe(0.9);
        });
    });
    (0, vitest_1.describe)('Drift vector field', () => {
        (0, vitest_1.it)('should compute 3D drift vector', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(plane.driftVectorField.x).toBe(0.1);
            (0, vitest_1.expect)(plane.driftVectorField.y).toBe(0.055);
            (0, vitest_1.expect)(plane.driftVectorField.z).toBe(0.85);
            (0, vitest_1.expect)(plane.driftVectorField.magnitude).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Composite reasoning heatmap', () => {
        (0, vitest_1.it)('should generate grid-based heatmap', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(plane.compositeReasoningHeatmap.gridSize).toBe(10);
            (0, vitest_1.expect)(plane.compositeReasoningHeatmap.values).toHaveLength(10);
            (0, vitest_1.expect)(plane.compositeReasoningHeatmap.values[0]).toHaveLength(10);
        });
        (0, vitest_1.it)('should have valid heatmap bounds', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            plane.compositeReasoningHeatmap.values.forEach((row) => {
                row.forEach((value) => {
                    (0, vitest_1.expect)(value).toBeGreaterThanOrEqual(0);
                    (0, vitest_1.expect)(value).toBeLessThanOrEqual(1);
                });
            });
        });
    });
    (0, vitest_1.describe)('Confidence trajectory', () => {
        (0, vitest_1.it)('should track confidence over time', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(plane.confidenceTrajectory.timestamps).toHaveLength(4);
            (0, vitest_1.expect)(plane.confidenceTrajectory.values).toHaveLength(4);
        });
        (0, vitest_1.it)('should detect trend in confidence trajectory', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesDegrading)();
            const aggregate = {
                rollingDriftAverage: 0.2125,
                rollingContradictionAverage: 0.1625,
                rollingSemanticAverage: 0.65,
                stabilityScore: 0.6,
                trend: 'DEGRADING',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(['increasing', 'decreasing', 'stable']).toContain(plane.confidenceTrajectory.trend);
        });
    });
    (0, vitest_1.describe)('Narrative risk radar', () => {
        (0, vitest_1.it)('should categorize risk levels', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(['low', 'medium', 'high']).toContain(plane.narrativeRiskRadar.riskLevel);
            (0, vitest_1.expect)(plane.narrativeRiskRadar.categories).toHaveLength(3);
            (0, vitest_1.expect)(plane.narrativeRiskRadar.values).toHaveLength(3);
        });
        (0, vitest_1.it)('should mark medium risk for moderately degrading runs', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesDegrading)();
            const aggregate = {
                rollingDriftAverage: 0.35,
                rollingContradictionAverage: 0.3,
                rollingSemanticAverage: 0.5,
                stabilityScore: 0.4,
                trend: 'DEGRADING',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(['medium', 'high']).toContain(plane.narrativeRiskRadar.riskLevel);
        });
    });
    (0, vitest_1.describe)('Multi-run trend line', () => {
        (0, vitest_1.it)('should track all trend dimensions', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const aggregate = {
                rollingDriftAverage: 0.1,
                rollingContradictionAverage: 0.055,
                rollingSemanticAverage: 0.85,
                stabilityScore: 0.9,
                trend: 'STABLE',
                runCount: 4,
            };
            const plane = engine.generatePlane(aggregate, runs);
            (0, vitest_1.expect)(plane.multiRunTrendLine.driftTrend).toHaveLength(4);
            (0, vitest_1.expect)(plane.multiRunTrendLine.contradictionTrend).toHaveLength(4);
            (0, vitest_1.expect)(plane.multiRunTrendLine.semanticTrend).toHaveLength(4);
        });
    });
});
//# sourceMappingURL=StabilityPlaneEngine.test.js.map