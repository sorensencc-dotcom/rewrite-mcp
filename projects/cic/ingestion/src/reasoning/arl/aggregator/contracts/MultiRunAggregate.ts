export type StabilityTrend = 'STABLE' | 'IMPROVING' | 'DEGRADING';

export interface MultiRunAggregate {
  totalRuns: number;

  rollingDriftAverage: number;
  rollingContradictionAverage: number;
  rollingConfidenceAverage: number;
  rollingCompositeAverage: number;

  stabilityScore: number; // 0.0–1.0 (overall stability)
  trend: StabilityTrend; // direction of change over time
}
