import { ThresholdResult } from '../contracts/ThresholdConfig';
import { GovernanceSignal } from '../contracts/GovernanceSignal';
export declare class GovernanceSignalGenerator {
    generate(thresholdResult: ThresholdResult, expansionId: string, driftVector?: {
        semantic: number;
        temporal: number;
        narrative: number;
        causal: number;
        magnitude: number;
    }): GovernanceSignal;
    private buildReasons;
    private assessNarrativeRisk;
    private determineEscalationPath;
    private mapDecision;
}
//# sourceMappingURL=GovernanceSignalGenerator.d.ts.map