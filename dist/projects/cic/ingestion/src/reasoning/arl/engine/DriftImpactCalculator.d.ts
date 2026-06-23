import { DriftImpact } from '../contracts/index';
export interface DriftVector {
    semanticDrift: number;
    temporalDrift: number;
    narrativeDrift: number;
    causalDrift: number;
    compositeDrift: number;
    overall: number;
}
export declare function calculateDriftImpact(driftInput: {
    semanticDrift?: number;
    temporalDrift?: number;
    narrativeDrift?: number;
    causalDrift?: number;
    compositeDrift?: number;
}): DriftImpact & DriftVector;
//# sourceMappingURL=DriftImpactCalculator.d.ts.map