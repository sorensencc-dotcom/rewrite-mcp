import { MultiRunAggregate } from '../contracts/MultiRunAggregate';
import { RunSummary } from '../contracts/RunSummary';
import { StabilityPlane } from '../contracts/StabilityPlane';

export class StabilityPlaneEngine {
  generatePlane(
    aggregate: MultiRunAggregate,
    runs: RunSummary[]
  ): StabilityPlane {
    return {
      id: `plane-${Date.now()}`,
      timestamp: new Date().toISOString(),
      driftVectorField: this.computeDriftVectorField(aggregate),
      compositeReasoningHeatmap: this.computeCompositeReasoningHeatmap(runs),
      confidenceTrajectory: this.computeConfidenceTrajectory(runs),
      narrativeRiskRadar: this.computeNarrativeRiskRadar(aggregate),
      multiRunTrendLine: this.computeMultiRunTrendLine(runs),
      overallStabilityScore: aggregate.stabilityScore,
    };
  }

  private computeDriftVectorField(aggregate: MultiRunAggregate) {
    return {
      x: aggregate.rollingDriftAverage,
      y: aggregate.rollingContradictionAverage,
      z: aggregate.rollingSemanticAverage,
      magnitude: Math.sqrt(
        Math.pow(aggregate.rollingDriftAverage, 2) +
          Math.pow(aggregate.rollingContradictionAverage, 2) +
          Math.pow(aggregate.rollingSemanticAverage, 2)
      ),
    };
  }

  private computeCompositeReasoningHeatmap(runs: RunSummary[]) {
    const gridSize = 10;
    const values: number[][] = [];

    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        const runIndex = Math.floor((i * gridSize + j) / (gridSize * gridSize) * runs.length);
        const run = runs[Math.min(runIndex, runs.length - 1)];
        row.push(1 - run.driftScore);
      }
      values.push(row);
    }

    return {
      gridSize,
      values,
      maxValue: 1.0,
      minValue: 0.0,
    };
  }

  private computeConfidenceTrajectory(runs: RunSummary[]) {
    const timestamps = runs.map((r) => r.timestamp);
    const values = runs.map((r) => 1 - r.contradictionScore);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (runs.length > 1) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg + 0.05) {
        trend = 'increasing';
      } else if (secondAvg < firstAvg - 0.05) {
        trend = 'decreasing';
      }
    }

    return { timestamps, values, trend };
  }

  private computeNarrativeRiskRadar(aggregate: MultiRunAggregate) {
    const categories = ['Drift Risk', 'Contradiction Risk', 'Semantic Risk'];
    const values = [
      aggregate.rollingDriftAverage,
      aggregate.rollingContradictionAverage,
      1 - aggregate.rollingSemanticAverage,
    ];

    const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgRisk > 0.6) {
      riskLevel = 'high';
    } else if (avgRisk > 0.3) {
      riskLevel = 'medium';
    }

    return { categories, values, riskLevel };
  }

  private computeMultiRunTrendLine(runs: RunSummary[]) {
    return {
      runIds: runs.map((r) => r.runId),
      timestamps: runs.map((r) => r.timestamp),
      driftTrend: runs.map((r) => r.driftScore),
      contradictionTrend: runs.map((r) => r.contradictionScore),
      semanticTrend: runs.map((r) => r.semanticScore),
    };
  }
}
