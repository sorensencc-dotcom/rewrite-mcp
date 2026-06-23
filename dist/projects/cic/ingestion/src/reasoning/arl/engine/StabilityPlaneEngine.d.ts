import { MultiRunAggregate } from '../contracts/MultiRunAggregate';
import { RunSummary } from '../contracts/RunSummary';
import { StabilityPlane } from '../contracts/StabilityPlane';
export declare class StabilityPlaneEngine {
    generatePlane(aggregate: MultiRunAggregate, runs: RunSummary[]): StabilityPlane;
    private computeDriftVectorField;
    private computeCompositeReasoningHeatmap;
    private computeConfidenceTrajectory;
    private computeNarrativeRiskRadar;
    private computeMultiRunTrendLine;
}
//# sourceMappingURL=StabilityPlaneEngine.d.ts.map