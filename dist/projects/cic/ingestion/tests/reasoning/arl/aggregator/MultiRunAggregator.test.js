"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MultiRunAggregator_1 = require("../../../../src/reasoning/arl/aggregator/engine/MultiRunAggregator");
(0, vitest_1.describe)('MultiRunAggregator — Phase 7.16', () => {
    const aggregator = new MultiRunAggregator_1.MultiRunAggregator();
    const makeRun = (id, drift, contradiction, confidence, composite) => ({
        runId: id,
        timestamp: '2026-06-05T12:00:00Z',
        driftScore: drift,
        contradictionScore: contradiction,
        confidenceScore: confidence,
        compositeScore: composite,
    });
    (0, vitest_1.describe)('Rolling Averages', () => {
        (0, vitest_1.it)('computes correct rolling averages over run series', () => {
            const runs = [
                makeRun('r1', 0.1, 0.0, 0.9, 0.9),
                makeRun('r2', 0.2, 0.1, 0.8, 0.85),
                makeRun('r3', 0.3, 0.2, 0.7, 0.8),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.totalRuns).toBe(3);
            (0, vitest_1.expect)(agg.rollingDriftAverage).toBeCloseTo((0.1 + 0.2 + 0.3) / 3, 3);
            (0, vitest_1.expect)(agg.rollingContradictionAverage).toBeCloseTo((0.0 + 0.1 + 0.2) / 3, 3);
            (0, vitest_1.expect)(agg.rollingConfidenceAverage).toBeCloseTo((0.9 + 0.8 + 0.7) / 3, 3);
            (0, vitest_1.expect)(agg.rollingCompositeAverage).toBeCloseTo((0.9 + 0.85 + 0.8) / 3, 3);
        });
        (0, vitest_1.it)('handles single run', () => {
            const runs = [
                makeRun('r1', 0.15, 0.05, 0.85, 0.87),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.totalRuns).toBe(1);
            (0, vitest_1.expect)(agg.rollingDriftAverage).toBeCloseTo(0.15, 3);
            (0, vitest_1.expect)(agg.rollingContradictionAverage).toBeCloseTo(0.05, 3);
            (0, vitest_1.expect)(agg.rollingConfidenceAverage).toBeCloseTo(0.85, 3);
        });
        (0, vitest_1.it)('handles many runs', () => {
            const runs = Array.from({ length: 100 }, (_, i) => makeRun(`r${i}`, 0.1 + i * 0.001, 0.05 + i * 0.0005, 0.9 - i * 0.001, 0.85 - i * 0.0008));
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.totalRuns).toBe(100);
            (0, vitest_1.expect)(agg.rollingDriftAverage).toBeGreaterThan(0.1);
            (0, vitest_1.expect)(agg.rollingConfidenceAverage).toBeLessThan(0.9);
        });
    });
    (0, vitest_1.describe)('Trend Detection', () => {
        (0, vitest_1.it)('detects degrading trend when drift increases', () => {
            const runs = [
                makeRun('r1', 0.1, 0.0, 0.9, 0.9),
                makeRun('r2', 0.2, 0.0, 0.9, 0.9),
                makeRun('r3', 0.3, 0.0, 0.9, 0.9),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('DEGRADING');
        });
        (0, vitest_1.it)('detects improving trend when drift decreases', () => {
            const runs = [
                makeRun('r1', 0.3, 0.2, 0.7, 0.8),
                makeRun('r2', 0.2, 0.1, 0.8, 0.85),
                makeRun('r3', 0.1, 0.0, 0.9, 0.9),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('IMPROVING');
        });
        (0, vitest_1.it)('returns stable trend for minimal drift change', () => {
            const runs = [
                makeRun('r1', 0.1, 0.0, 0.9, 0.9),
                makeRun('r2', 0.12, 0.0, 0.9, 0.9),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('STABLE');
        });
        (0, vitest_1.it)('detects trend from first to last run regardless of middle', () => {
            const runs = [
                makeRun('r1', 0.12, 0.0, 0.9, 0.9),
                makeRun('r2', 0.3, 0.2, 0.7, 0.8), // middle spike
                makeRun('r3', 0.05, 0.05, 0.85, 0.87), // back down significantly
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('IMPROVING'); // 0.12 → 0.05 is -0.07, improving
        });
    });
    (0, vitest_1.describe)('Stability Scoring', () => {
        (0, vitest_1.it)('scores stable runs high', () => {
            const runs = [
                makeRun('r1', 0.05, 0.02, 0.95, 0.95),
                makeRun('r2', 0.06, 0.03, 0.94, 0.94),
                makeRun('r3', 0.05, 0.02, 0.95, 0.95),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.stabilityScore).toBeGreaterThan(0.85);
        });
        (0, vitest_1.it)('scores degraded runs low', () => {
            const runs = [
                makeRun('r1', 0.7, 0.6, 0.2, 0.25),
                makeRun('r2', 0.75, 0.65, 0.15, 0.2),
                makeRun('r3', 0.8, 0.7, 0.1, 0.15),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.stabilityScore).toBeLessThan(0.3);
        });
        (0, vitest_1.it)('balances drift penalty against confidence bonus', () => {
            // High confidence but high drift
            const runA = [
                makeRun('r1', 0.5, 0.1, 0.95, 0.9),
            ];
            const aggA = aggregator.aggregate(runA);
            // Lower confidence, lower drift
            const runB = [
                makeRun('r1', 0.1, 0.05, 0.75, 0.8),
            ];
            const aggB = aggregator.aggregate(runB);
            // Both should be reasonable but different
            (0, vitest_1.expect)(aggA.stabilityScore).toBeGreaterThan(0.4);
            (0, vitest_1.expect)(aggB.stabilityScore).toBeGreaterThan(0.5);
        });
    });
    (0, vitest_1.describe)('Empty Input', () => {
        (0, vitest_1.it)('handles empty run list with sane defaults', () => {
            const agg = aggregator.aggregate([]);
            (0, vitest_1.expect)(agg.totalRuns).toBe(0);
            (0, vitest_1.expect)(agg.rollingDriftAverage).toBe(0);
            (0, vitest_1.expect)(agg.rollingContradictionAverage).toBe(0);
            (0, vitest_1.expect)(agg.rollingConfidenceAverage).toBe(0);
            (0, vitest_1.expect)(agg.rollingCompositeAverage).toBe(0);
            (0, vitest_1.expect)(agg.stabilityScore).toBeCloseTo(1.0, 3);
            (0, vitest_1.expect)(agg.trend).toBe('STABLE');
        });
    });
    (0, vitest_1.describe)('Real-World Scenarios', () => {
        (0, vitest_1.it)('aggregates improving session (errors decreasing over time)', () => {
            const runs = [
                makeRun('r1', 0.4, 0.3, 0.65, 0.7),
                makeRun('r2', 0.3, 0.25, 0.7, 0.75),
                makeRun('r3', 0.2, 0.2, 0.75, 0.8),
                makeRun('r4', 0.1, 0.1, 0.85, 0.87),
                makeRun('r5', 0.05, 0.05, 0.9, 0.92),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('IMPROVING');
            (0, vitest_1.expect)(agg.stabilityScore).toBeGreaterThan(0.5);
        });
        (0, vitest_1.it)('aggregates oscillating session (trend neutral)', () => {
            const runs = [
                makeRun('r1', 0.2, 0.1, 0.8, 0.8),
                makeRun('r2', 0.3, 0.15, 0.75, 0.78),
                makeRun('r3', 0.25, 0.12, 0.78, 0.79),
                makeRun('r4', 0.28, 0.14, 0.76, 0.77),
                makeRun('r5', 0.22, 0.11, 0.79, 0.81),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('STABLE');
            (0, vitest_1.expect)(agg.rollingDriftAverage).toBeCloseTo(0.25, 1);
        });
        (0, vitest_1.it)('aggregates catastrophic session (errors spiking)', () => {
            const runs = [
                makeRun('r1', 0.1, 0.05, 0.9, 0.9),
                makeRun('r2', 0.25, 0.2, 0.8, 0.82),
                makeRun('r3', 0.5, 0.4, 0.6, 0.65),
                makeRun('r4', 0.7, 0.6, 0.4, 0.45),
                makeRun('r5', 0.8, 0.7, 0.3, 0.35),
            ];
            const agg = aggregator.aggregate(runs);
            (0, vitest_1.expect)(agg.trend).toBe('DEGRADING');
            (0, vitest_1.expect)(agg.stabilityScore).toBeLessThan(0.3);
        });
    });
});
//# sourceMappingURL=MultiRunAggregator.test.js.map