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

export class VerdictSynthesizer {
  private thresholdModel: ThresholdModel;

  constructor(thresholdModel?: ThresholdModel) {
    this.thresholdModel = thresholdModel || new ThresholdModel();
  }

  synthesize(
    reasoning: string,
    confidence: number,
    compositeReasoning?: number,
    driftMagnitude?: number,
    contradictionSeverity?: number,
    trace?: FormattedTraceStep[]
  ): Verdict {
    // If threshold metrics provided, use deterministic threshold model (Phase 7.12)
    if (
      compositeReasoning !== undefined &&
      driftMagnitude !== undefined &&
      contradictionSeverity !== undefined
    ) {
      const thresholdResult = this.thresholdModel.evaluate({
        compositeReasoning,
        confidence,
        driftMagnitude,
        contradictionSeverity,
      });

      const verdict: Verdict = {
        decision: thresholdResult.decision,
        confidence,
        reasoning,
        thresholdResult,
        rejectCode: thresholdResult.rejectCode,
      };

      if (trace) {
        verdict.reasoningTrace = trace;
      }

      return verdict;
    }

    // Fallback: legacy confidence-only mode
    const verdict: Verdict = {
      decision: confidence > 0.8 ? 'ACCEPT' : 'REVIEW_REQUIRED',
      confidence,
      reasoning,
    };

    if (trace) {
      verdict.reasoningTrace = trace;
    }

    return verdict;
  }
}
