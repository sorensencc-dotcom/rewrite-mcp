"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MultiRunAggregator_1 = require("../engine/MultiRunAggregator");
const RunSummaryFixtures_1 = require("./fixtures/RunSummaryFixtures");
(0, vitest_1.describe)('Batch 2, Phase 7.16: Multi-Run Aggregator', () => {
    let aggregator;
    (0, vitest_1.beforeEach)(() => {
        aggregator = new MultiRunAggregator_1.MultiRunAggregator();
    });
    (0, vitest_1.describe)('Rolling averages', () => {
        (0, vitest_1.it)('should compute correct drift average', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const result = aggregator.aggregate(runs);
            const expectedDrift = (0.1 + 0.11 + 0.12 + 0.1) / 4;
            (0, vitest_1.expect)(result.rollingDriftAverage).toBeCloseTo(expectedDrift, 2);
        });
        (0, vitest_1.it)('should compute correct contradiction average', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const result = aggregator.aggregate(runs);
            const expectedContradiction = (0.05 + 0.06 + 0.05 + 0.06) / 4;
            (0, vitest_1.expect)(result.rollingContradictionAverage).toBeCloseTo(expectedContradiction, 2);
        });
        (0, vitest_1.it)('should compute correct semantic average', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const result = aggregator.aggregate(runs);
            const expectedSemantic = (0.85 + 0.84 + 0.85 + 0.84) / 4;
            (0, vitest_1.expect)(result.rollingSemanticAverage).toBeCloseTo(expectedSemantic, 2);
        });
        (0, vitest_1.it)('should handle single run', () => {
            const singleRun = (0, RunSummaryFixtures_1.makeSingleRun)();
            const result = aggregator.aggregate([singleRun]);
            (0, vitest_1.expect)(result.rollingDriftAverage).toBe(singleRun.driftScore);
            (0, vitest_1.expect)(result.rollingContradictionAverage).toBe(singleRun.contradictionScore);
            (0, vitest_1.expect)(result.rollingSemanticAverage).toBe(singleRun.semanticScore);
            (0, vitest_1.expect)(result.runCount).toBe(1);
        });
        (0, vitest_1.it)('should handle empty runs', () => {
            const result = aggregator.aggregate([]);
            (0, vitest_1.expect)(result.rollingDriftAverage).toBe(0);
            (0, vitest_1.expect)(result.rollingContradictionAverage).toBe(0);
            (0, vitest_1.expect)(result.rollingSemanticAverage).toBe(0);
            (0, vitest_1.expect)(result.runCount).toBe(0);
            (0, vitest_1.expect)(result.stabilityScore).toBe(1.0);
        });
    });
    (0, vitest_1.describe)('Trend detection', () => {
        (0, vitest_1.it)('should detect stable trend', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.trend).toBe('STABLE');
        });
        (0, vitest_1.it)('should detect degrading trend', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesDegrading)();
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.trend).toBe('DEGRADING');
        });
        (0, vitest_1.it)('should detect improving trend', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesImproving)();
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.trend).toBe('IMPROVING');
        });
    });
    (0, vitest_1.describe)('Stability scoring', () => {
        (0, vitest_1.it)('should compute high stability for low drift', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.stabilityScore).toBeGreaterThan(0.8);
        });
        (0, vitest_1.it)('should compute low stability for high drift', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesDegrading)();
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.stabilityScore).toBeLessThan(0.7);
        });
    });
    (0, vitest_1.describe)('Incremental append', () => {
        (0, vitest_1.it)('should maintain consistency between append and full recompute', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            const fullAggregate = aggregator.aggregate(runs);
            const initial = aggregator.aggregate(runs.slice(0, 2));
            const appended = aggregator.appendRun(initial, runs[2]);
            const appendedAgain = aggregator.appendRun(appended, runs[3]);
            (0, vitest_1.expect)(appendedAgain.rollingDriftAverage).toBeCloseTo(fullAggregate.rollingDriftAverage, 3);
            (0, vitest_1.expect)(appendedAgain.rollingContradictionAverage).toBeCloseTo(fullAggregate.rollingContradictionAverage, 3);
            (0, vitest_1.expect)(appendedAgain.rollingSemanticAverage).toBeCloseTo(fullAggregate.rollingSemanticAverage, 3);
        });
        (0, vitest_1.it)('should handle first append correctly', () => {
            const initial = {
                rollingDriftAverage: 0,
                rollingContradictionAverage: 0,
                rollingSemanticAverage: 0,
                stabilityScore: 1.0,
                trend: 'STABLE',
                runCount: 0,
            };
            const newRun = (0, RunSummaryFixtures_1.makeSingleRun)();
            const result = aggregator.appendRun(initial, newRun);
            (0, vitest_1.expect)(result.runCount).toBe(1);
            (0, vitest_1.expect)(result.rollingDriftAverage).toBe(newRun.driftScore);
            (0, vitest_1.expect)(result.rollingContradictionAverage).toBe(newRun.contradictionScore);
        });
        (0, vitest_1.it)('should correctly average after multiple appends', () => {
            const runs = (0, RunSummaryFixtures_1.makeRunSeriesStable)();
            let aggregate = aggregator.aggregate([]);
            for (const run of runs) {
                aggregate = aggregator.appendRun(aggregate, run);
            }
            const fullAggregate = aggregator.aggregate(runs);
            (0, vitest_1.expect)(aggregate.rollingDriftAverage).toBeCloseTo(fullAggregate.rollingDriftAverage, 3);
        });
    });
    (0, vitest_1.describe)('Edge cases', () => {
        (0, vitest_1.it)('should handle single-run series with trend detection', () => {
            const runs = [(0, RunSummaryFixtures_1.makeSingleRun)()];
            const result = aggregator.aggregate(runs);
            (0, vitest_1.expect)(result.runCount).toBe(1);
            (0, vitest_1.expect)(result.trend).toBe('STABLE');
        });
        (0, vitest_1.it)('should handle two-run series for trend detection', () => {
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
            (0, vitest_1.expect)(result.runCount).toBe(2);
            (0, vitest_1.expect)(['STABLE', 'DEGRADING', 'IMPROVING']).toContain(result.trend);
        });
    });
});
//# sourceMappingURL=MultiRunAggregator.test.js.map