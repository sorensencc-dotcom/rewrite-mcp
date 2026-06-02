import { FormattedTraceStep } from './ReasoningTraceFormatter';

export interface Verdict {
  decision: string;
  confidence: number;
  reasoning: string;
  reasoningTrace?: FormattedTraceStep[];
}

export class VerdictSynthesizer {
  synthesize(
    reasoning: string,
    confidence: number,
    trace?: FormattedTraceStep[]
  ): Verdict {
    const verdict: Verdict = {
      decision: confidence > 0.8 ? 'APPROVED' : 'REVIEW_REQUIRED',
      confidence,
      reasoning,
    };

    if (trace) {
      verdict.reasoningTrace = trace;
    }

    return verdict;
  }
}
