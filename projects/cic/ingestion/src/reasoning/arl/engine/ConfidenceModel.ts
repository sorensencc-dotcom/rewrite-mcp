import { ArlConfidence, CompositeReasoning } from '../contracts/index';
import { DEFAULT_WEIGHTS } from './WeightingModel';

export interface ConfidenceScore {
  score: number;
  weightedScore: number;
  reasoning: string;
  threshold: number;
}

export function calculateConfidence(
  composite: CompositeReasoning & {
    coherence: number;
    semantic: number;
    temporal: number;
    causal: number;
    narrative: number;
    overall: number;
  }
): ArlConfidence & ConfidenceScore {
  const weightedScore =
    composite.coherence * DEFAULT_WEIGHTS.coherence +
    composite.semantic * DEFAULT_WEIGHTS.semantic +
    composite.temporal * DEFAULT_WEIGHTS.temporal +
    composite.causal * DEFAULT_WEIGHTS.causal +
    composite.narrative * DEFAULT_WEIGHTS.narrative;

  const threshold = 0.8;
  const decision = weightedScore > threshold ? 'APPROVED' : 'REVIEW_REQUIRED';

  return {
    score: weightedScore,
    weightedScore,
    details: `Confidence score: ${weightedScore.toFixed(2)} (${decision})`,
    reasoning: `Weighted reasoning score of ${weightedScore.toFixed(2)} ${weightedScore > threshold ? 'exceeds' : 'below'} approval threshold of ${threshold}`,
    threshold,
  };
}
