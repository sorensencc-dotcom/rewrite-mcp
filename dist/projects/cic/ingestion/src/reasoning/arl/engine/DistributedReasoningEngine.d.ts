import { DistributedReasoningState } from '../contracts/DistributedReasoning';
export declare class DistributedReasoningEngine {
    coordinateRegions(regionIds: string[], regionalScores: Record<string, number>): DistributedReasoningState;
    private computeRegionalDrifts;
    private computeCrossRegionConsensus;
    private detectDivergences;
    private buildArbitrationWorkflows;
}
//# sourceMappingURL=DistributedReasoningEngine.d.ts.map