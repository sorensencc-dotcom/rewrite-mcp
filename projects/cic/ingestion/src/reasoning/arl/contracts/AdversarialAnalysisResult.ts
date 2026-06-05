import { AdversarialSignal } from './AdversarialSignal';

export interface AdversarialAnalysisResult {
  isAdversarial: boolean;
  signals: AdversarialSignal[];
  recommendedVerdictOverride?: 'REJECT' | 'QUARANTINE';
  averageSeverity: number; // 0–1
}
