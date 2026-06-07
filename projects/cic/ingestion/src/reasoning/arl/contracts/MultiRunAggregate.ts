export interface MultiRunAggregate {
  rollingDriftAverage: number;
  rollingContradictionAverage: number;
  rollingSemanticAverage: number;
  stabilityScore: number; // 0–1, higher = more stable
  trend: 'STABLE' | 'IMPROVING' | 'DEGRADING';
  runCount: number;
}
