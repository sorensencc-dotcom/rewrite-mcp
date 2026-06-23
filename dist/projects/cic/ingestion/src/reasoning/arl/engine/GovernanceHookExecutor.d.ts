import { GovernanceSignal } from '../contracts/GovernanceSignal';
import { ThresholdResult } from '../contracts/ThresholdConfig';
interface DriftVector {
    semantic: number;
    temporal: number;
    narrative: number;
    causal: number;
}
export declare class GovernanceHookExecutor {
    private auditLog;
    executeThreshold(phaseId: string, thresholdResult: ThresholdResult, driftVector: DriftVector, narrativeRiskLevel: 'low' | 'medium' | 'high'): GovernanceSignal;
    private buildReasonStrings;
    getAuditLog(): GovernanceSignal[];
    clearAuditLog(): void;
}
export {};
//# sourceMappingURL=GovernanceHookExecutor.d.ts.map