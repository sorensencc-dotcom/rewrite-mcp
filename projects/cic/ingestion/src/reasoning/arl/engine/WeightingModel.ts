import { ArlWeights } from '../contracts/Weights';

export const DEFAULT_WEIGHTS: ArlWeights = {
  coherence: 0.20,
  semantic: 0.25,
  temporal: 0.20,
  causal: 0.15,
  narrative: 0.20,
};

export function validateWeights(weights: ArlWeights): boolean {
  const total =
    weights.coherence +
    weights.semantic +
    weights.temporal +
    weights.causal +
    weights.narrative;

  return Math.abs(total - 1.0) < 0.0001;
}

export function normalizeWeights(weights: Partial<ArlWeights>): ArlWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...weights };
  const total =
    merged.coherence +
    merged.semantic +
    merged.temporal +
    merged.causal +
    merged.narrative;

  if (total === 0) return DEFAULT_WEIGHTS;

  return {
    coherence: merged.coherence / total,
    semantic: merged.semantic / total,
    temporal: merged.temporal / total,
    causal: merged.causal / total,
    narrative: merged.narrative / total,
  };
}
