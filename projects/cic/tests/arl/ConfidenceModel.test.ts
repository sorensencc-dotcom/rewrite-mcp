import { describe, it, expect } from 'vitest';
import { computeArlConfidence } from '../../src/reasoning/arl/engine/ConfidenceModel';
import { CompositeReasoning } from '../../src/reasoning/arl/contracts/CompositeReasoning';

describe('ConfidenceModel', () => {
  it('returns deterministic structure with mirrored factors', () => {
    const composite: CompositeReasoning = {
      coherence: 0.1,
      semantic: 0.2,
      temporal: 0.3,
      causal: 0.4,
      narrative: 0.5,
      overall: 0.6
    };

    const result = computeArlConfidence(composite);

    expect(result).toEqual({
      weightedScore: 0,
      factors: {
        coherence: 0.1,
        semantic: 0.2,
        temporal: 0.3,
        causal: 0.4,
        narrative: 0.5
      }
    });
  });
});
