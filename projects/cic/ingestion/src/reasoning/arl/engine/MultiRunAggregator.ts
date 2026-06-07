import { RunSummary } from '../contracts/RunSummary';
import { MultiRunAggregate } from '../contracts/MultiRunAggregate';

export class MultiRunAggregator {
  aggregate(runs: RunSummary[]): MultiRunAggregate {
    if (runs.length === 0) {
      return {
        rollingDriftAverage: 0,
        rollingContradictionAverage: 0,
        rollingSemanticAverage: 0,
        stabilityScore: 1.0,
        trend: 'STABLE',
        runCount: 0,
      };
    }

    const driftAvg =
      runs.reduce((sum, r) => sum + r.driftScore, 0) / runs.length;
    const contradictionAvg =
      runs.reduce((sum, r) => sum + r.contradictionScore, 0) / runs.length;
    const semanticAvg =
      runs.reduce((sum, r) => sum + r.semanticScore, 0) / runs.length;

    const stabilityScore = this.computeStabilityScore(driftAvg, contradictionAvg);
    const trend = this.detectTrend(runs);

    return {
      rollingDriftAverage: driftAvg,
      rollingContradictionAverage: contradictionAvg,
      rollingSemanticAverage: semanticAvg,
      stabilityScore,
      trend,
      runCount: runs.length,
    };
  }

  appendRun(existing: MultiRunAggregate, newRun: RunSummary): MultiRunAggregate {
    if (existing.runCount === 0) {
      return {
        rollingDriftAverage: newRun.driftScore,
        rollingContradictionAverage: newRun.contradictionScore,
        rollingSemanticAverage: newRun.semanticScore,
        stabilityScore: 1.0,
        trend: 'STABLE',
        runCount: 1,
      };
    }

    const newCount = existing.runCount + 1;
    const driftAvg =
      (existing.rollingDriftAverage * existing.runCount +
        newRun.driftScore) /
      newCount;
    const contradictionAvg =
      (existing.rollingContradictionAverage * existing.runCount +
        newRun.contradictionScore) /
      newCount;
    const semanticAvg =
      (existing.rollingSemanticAverage * existing.runCount +
        newRun.semanticScore) /
      newCount;

    const stabilityScore = this.computeStabilityScore(driftAvg, contradictionAvg);

    return {
      rollingDriftAverage: driftAvg,
      rollingContradictionAverage: contradictionAvg,
      rollingSemanticAverage: semanticAvg,
      stabilityScore,
      trend: 'STABLE',
      runCount: newCount,
    };
  }

  private computeStabilityScore(
    driftAvg: number,
    contradictionAvg: number
  ): number {
    const combinedMetric = (driftAvg + contradictionAvg) / 2;
    return Math.pow(1 - combinedMetric, 2);
  }

  private detectTrend(runs: RunSummary[]): 'STABLE' | 'IMPROVING' | 'DEGRADING' {
    if (runs.length < 2) return 'STABLE';

    const firstHalf = runs.slice(0, Math.floor(runs.length / 2));
    const secondHalf = runs.slice(Math.floor(runs.length / 2));

    const firstDriftAvg =
      firstHalf.reduce((sum, r) => sum + r.driftScore, 0) / firstHalf.length;
    const secondDriftAvg =
      secondHalf.reduce((sum, r) => sum + r.driftScore, 0) / secondHalf.length;

    const driftDelta = secondDriftAvg - firstDriftAvg;
    const threshold = 0.05;

    if (driftDelta > threshold) {
      return 'DEGRADING';
    } else if (driftDelta < -threshold) {
      return 'IMPROVING';
    } else {
      return 'STABLE';
    }
  }
}
