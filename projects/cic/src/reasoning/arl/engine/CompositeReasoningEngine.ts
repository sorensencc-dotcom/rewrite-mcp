import { CompositeReasoning } from '../contracts/CompositeReasoning';
import { CoherenceScore } from '../contracts/CoherenceScore';
import { SemanticAlignment } from '../contracts/SemanticAlignment';
import { TemporalConsistency } from '../contracts/TemporalConsistency';
import { CausalReasoning } from '../contracts/CausalReasoning';
import { NarrativeImpact } from '../contracts/NarrativeImpact';

export function computeCompositeReasoning(
  coherence: CoherenceScore,
  semantic: SemanticAlignment,
  temporal: TemporalConsistency,
  causal: CausalReasoning,
  narrative: NarrativeImpact
): CompositeReasoning {
  return {
    coherence: coherence.overall,
    semantic: semantic.overall,
    temporal: temporal.overall,
    causal: causal.overall,
    narrative: narrative.overall,
    overall: 0
  };
}
