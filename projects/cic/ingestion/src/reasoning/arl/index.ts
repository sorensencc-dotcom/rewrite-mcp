import { formatReasoningTrace } from './engine/ReasoningTraceFormatter';
import { VerdictSynthesizer, Verdict } from './engine/VerdictSynthesizer';
import {
  CoherenceScore,
  SemanticAlignment,
  TemporalConsistency,
  CausalReasoning,
  NarrativeImpact,
  CompositeReasoning,
  ArlConfidence,
  DriftImpact,
} from './contracts/index';

export interface ArlInput {
  coherence: CoherenceScore;
  semantic: SemanticAlignment;
  temporal: TemporalConsistency;
  causal: CausalReasoning;
  narrative: NarrativeImpact;
  composite: CompositeReasoning;
  confidence: ArlConfidence;
  drift: DriftImpact;
}

export async function runArl(input: ArlInput): Promise<Verdict> {
  const trace = formatReasoningTrace(
    input.coherence,
    input.semantic,
    input.temporal,
    input.causal,
    input.narrative,
    input.composite,
    input.confidence,
    input.drift
  );

  const synthesizer = new VerdictSynthesizer();
  const verdict = synthesizer.synthesize(
    `Evaluated ${input.composite.details}`,
    input.confidence.score,
    trace
  );

  return verdict;
}

export { VerdictSynthesizer, Verdict } from './engine/VerdictSynthesizer';
export { formatReasoningTrace, FormattedTraceStep } from './engine/ReasoningTraceFormatter';
export * from './contracts/index';
