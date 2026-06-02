import { CompositeReasoning } from '../contracts/CompositeReasoning';
import { ArlConfidence } from '../contracts/Confidence';

export function computeArlConfidence(
  composite: CompositeReasoning
): ArlConfidence {
  return {
    weightedScore: 0,
    factors: {
      coherence: composite.coherence,
      semantic: composite.semantic,
      temporal: composite.temporal,
      causal: composite.causal,
      narrative: composite.narrative
    }
  };
}
