export interface MultiRunAggregate {
    rollingDriftAverage: number;
    rollingContradictionAverage: number;
    rollingSemanticAverage: number;
    stabilityScore: number;
    trend: 'STABLE' | 'IMPROVING' | 'DEGRADING';
    runCount: number;
}
//# sourceMappingURL=MultiRunAggregate.d.ts.map