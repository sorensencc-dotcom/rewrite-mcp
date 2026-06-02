import {
  CoherenceScore,
  SemanticAlignment,
  TemporalConsistency,
  CausalReasoning,
  NarrativeImpact,
  CompositeReasoning,
  ArlConfidence,
  DriftImpact,
} from '../contracts/index';

export interface FormattedTraceStep {
  subsystem: string;
  summary: string;
  score: number;
}

export function formatReasoningTrace(
  coherence: CoherenceScore,
  semantic: SemanticAlignment,
  temporal: TemporalConsistency,
  causal: CausalReasoning,
  narrative: NarrativeImpact,
  composite: CompositeReasoning,
  confidence: ArlConfidence,
  drift: DriftImpact
): FormattedTraceStep[] {
  return [
    {
      subsystem: 'coherence',
      summary: coherence.details,
      score: coherence.score,
    },
    {
      subsystem: 'semantic',
      summary: semantic.details,
      score: semantic.score,
    },
    {
      subsystem: 'temporal',
      summary: temporal.details,
      score: temporal.score,
    },
    {
      subsystem: 'causal',
      summary: causal.details,
      score: causal.score,
    },
    {
      subsystem: 'narrative',
      summary: narrative.details,
      score: narrative.score,
    },
    {
      subsystem: 'composite',
      summary: composite.details,
      score: composite.score,
    },
    {
      subsystem: 'confidence',
      summary: confidence.details,
      score: confidence.score,
    },
    {
      subsystem: 'drift',
      summary: drift.details,
      score: drift.score,
    },
  ];
}
