export interface RegionalDriftVector {
    regionId: string;
    driftScore: number;
    timestamp: string;
}
export interface CrossRegionConsensus {
    regionIds: string[];
    consensusScore: number;
    agreementLevel: number;
}
export interface DivergenceSignal {
    regionId: string;
    divergenceType: 'drift' | 'contradiction' | 'semantic' | 'temporal';
    severity: number;
    details: string;
}
export interface ArbitrationWorkflow {
    workflowId: string;
    divergenceSignals: DivergenceSignal[];
    arbitrationMethod: 'voting' | 'weighting' | 'consensus';
    resolvedVerdict?: string;
}
export interface DistributedReasoningState {
    id: string;
    timestamp: string;
    regionalDrifts: RegionalDriftVector[];
    crossRegionConsensus: CrossRegionConsensus;
    divergenceSignals: DivergenceSignal[];
    arbitrationWorkflows: ArbitrationWorkflow[];
}
//# sourceMappingURL=DistributedReasoning.d.ts.map