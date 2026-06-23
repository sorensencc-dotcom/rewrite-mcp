"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiRunAggregator = void 0;
/**
 * Phase 7.16 — Multi-Run Aggregator
 * Evaluates reasoning across multiple expansions with rolling drift/stability analysis
 */
class MultiRunAggregator {
    aggregate(runs) {
        if (runs.length === 0) {
            return {
                totalRuns: 0,
                rollingDriftAverage: 0,
                rollingContradictionAverage: 0,
                rollingConfidenceAverage: 0,
                rollingCompositeAverage: 0,
                stabilityScore: 1.0,
                trend: 'STABLE',
            };
        }
        const totalRuns = runs.length;
        const rollingDriftAverage = this.average(runs.map((r) => r.driftScore));
        const rollingContradictionAverage = this.average(runs.map((r) => r.contradictionScore));
        const rollingConfidenceAverage = this.average(runs.map((r) => r.confidenceScore));
        const rollingCompositeAverage = this.average(runs.map((r) => r.compositeScore));
        const trend = this.computeTrend(runs.map((r) => r.driftScore));
        const stabilityScore = this.computeStabilityScore(rollingDriftAverage, rollingContradictionAverage, rollingConfidenceAverage);
        return {
            totalRuns,
            rollingDriftAverage,
            rollingContradictionAverage,
            rollingConfidenceAverage,
            rollingCompositeAverage,
            stabilityScore,
            trend,
        };
    }
    appendRun(_existing, _newRun) {
        throw new Error('appendRun not implemented: requires run history or incremental formulas');
    }
    average(values) {
        if (values.length === 0)
            return 0;
        const sum = values.reduce((acc, v) => acc + v, 0);
        return sum / values.length;
    }
    computeTrend(driftSeries) {
        if (driftSeries.length < 2)
            return 'STABLE';
        const first = driftSeries[0];
        const last = driftSeries[driftSeries.length - 1];
        const delta = last - first;
        const threshold = 0.05;
        if (delta > threshold)
            return 'DEGRADING';
        if (delta < -threshold)
            return 'IMPROVING';
        return 'STABLE';
    }
    computeStabilityScore(driftAvg, contradictionAvg, confidenceAvg) {
        const driftPenalty = driftAvg;
        const contradictionPenalty = contradictionAvg;
        const confidenceBonus = confidenceAvg;
        let score = confidenceBonus - (driftPenalty + contradictionPenalty) / 2;
        score = Math.max(0, Math.min(1, score));
        return score;
    }
}
exports.MultiRunAggregator = MultiRunAggregator;
//# sourceMappingURL=MultiRunAggregator.js.map