import { FormattedTraceStep } from './ReasoningTraceFormatter';
import { ThresholdModel } from './ThresholdModel';
import { ThresholdResult } from '../contracts/ThresholdConfig';
export interface Verdict {
    decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE' | 'REVIEW_REQUIRED';
    confidence: number;
    reasoning: string;
    reasoningTrace?: FormattedTraceStep[];
    thresholdResult?: ThresholdResult;
    rejectCode?: string;
}
export declare class VerdictSynthesizer {
    private thresholdModel;
    constructor(thresholdModel?: ThresholdModel);
    synthesize(reasoning: string, confidence: number, compositeReasoning?: number, driftMagnitude?: number, contradictionSeverity?: number, trace?: FormattedTraceStep[]): Verdict;
}
//# sourceMappingURL=VerdictSynthesizer.d.ts.map