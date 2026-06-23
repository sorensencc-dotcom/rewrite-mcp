export type StabilityTrend = 'STABLE' | 'IMPROVING' | 'DEGRADING';
export interface MultiRunAggregate {
    totalRuns: number;
    rollingDriftAverage: number;
    rollingContradictionAverage: number;
    rollingConfidenceAverage: number;
    rollingCompositeAverage: number;
    stabilityScore: number;
    trend: StabilityTrend;
}
//# sourceMappingURL=MultiRunAggregate.d.ts.map