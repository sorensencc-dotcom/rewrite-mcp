export interface DriftVectorField {
    x: number;
    y: number;
    z: number;
    magnitude: number;
}
export interface CompositeReasoningHeatmap {
    gridSize: number;
    values: number[][];
    maxValue: number;
    minValue: number;
}
export interface ConfidenceTrajectory {
    timestamps: string[];
    values: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
}
export interface NarrativeRiskRadar {
    categories: string[];
    values: number[];
    riskLevel: 'low' | 'medium' | 'high';
}
export interface MultiRunTrendLine {
    runIds: string[];
    timestamps: string[];
    driftTrend: number[];
    contradictionTrend: number[];
    semanticTrend: number[];
}
export interface StabilityPlane {
    id: string;
    timestamp: string;
    driftVectorField: DriftVectorField;
    compositeReasoningHeatmap: CompositeReasoningHeatmap;
    confidenceTrajectory: ConfidenceTrajectory;
    narrativeRiskRadar: NarrativeRiskRadar;
    multiRunTrendLine: MultiRunTrendLine;
    overallStabilityScore: number;
}
//# sourceMappingURL=StabilityPlane.d.ts.map