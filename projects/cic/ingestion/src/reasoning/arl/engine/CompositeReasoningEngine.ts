import {
  CoherenceScore,
  SemanticAlignment,
  TemporalConsistency,
  CausalReasoning,
  NarrativeImpact,
  CompositeReasoning,
} from '../contracts/index';
import { DEFAULT_WEIGHTS } from './WeightingModel';

export interface CompositeScores {
  coherence: number;
  semantic: number;
  temporal: number;
  causal: number;
  narrative: number;
  overall: number;
}

export function calculateCompositeReasoning(
  coherence: CoherenceScore,
  semantic: SemanticAlignment,
  temporal: TemporalConsistency,
  causal: CausalReasoning,
  narrative: NarrativeImpact
): CompositeReasoning & CompositeScores {
  const coherenceScore = coherence.score || 0;
  const semanticScore = semantic.score || 0;
  const temporalScore = temporal.score || 0;
  const causalScore = causal.score || 0;
  const narrativeScore = narrative.score || 0;

  const overall =
    coherenceScore * DEFAULT_WEIGHTS.coherence +
    semanticScore * DEFAULT_WEIGHTS.semantic +
    temporalScore * DEFAULT_WEIGHTS.temporal +
    causalScore * DEFAULT_WEIGHTS.causal +
    narrativeScore * DEFAULT_WEIGHTS.narrative;

  return {
    score: overall,
    details: `Weighted composite reasoning: coherence=${coherenceScore.toFixed(2)}, semantic=${semanticScore.toFixed(2)}, temporal=${temporalScore.toFixed(2)}, causal=${causalScore.toFixed(2)}, narrative=${narrativeScore.toFixed(2)}`,
    coherence: coherenceScore,
    semantic: semanticScore,
    temporal: temporalScore,
    causal: causalScore,
    narrative: narrativeScore,
    overall,
  };
}
