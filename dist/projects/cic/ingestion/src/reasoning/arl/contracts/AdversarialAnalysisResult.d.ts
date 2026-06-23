import { AdversarialSignal } from './AdversarialSignal';
export interface AdversarialAnalysisResult {
    isAdversarial: boolean;
    signals: AdversarialSignal[];
    recommendedVerdictOverride?: 'REJECT' | 'QUARANTINE';
    averageSeverity: number;
}
//# sourceMappingURL=AdversarialAnalysisResult.d.ts.map