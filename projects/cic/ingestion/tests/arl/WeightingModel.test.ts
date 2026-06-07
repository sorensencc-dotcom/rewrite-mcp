import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_WEIGHTS,
  validateWeights,
  normalizeWeights,
} from '../../src/reasoning/arl/engine/WeightingModel';

describe('WeightingModel', () => {
  it('defines deterministic default weights', () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      coherence: 0.20,
      semantic: 0.25,
      temporal: 0.20,
      causal: 0.15,
      narrative: 0.20,
    });
  });

  it('validates weights sum to 1.0', () => {
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
  });

  it('rejects weights that do not sum to 1.0', () => {
    const invalid = {
      coherence: 0.25,
      semantic: 0.25,
      temporal: 0.25,
      causal: 0.15,
      narrative: 0.15,
    };
    expect(validateWeights(invalid)).toBe(false);
  });

  it('normalizes partial weights to sum to 1.0', () => {
    const partial = {
      coherence: 2,
      semantic: 2.5,
      temporal: 2,
      causal: 1.5,
      narrative: 2,
    };

    const normalized = normalizeWeights(partial);

    expect(validateWeights(normalized)).toBe(true);
    expect(normalized.coherence).toBeCloseTo(0.20);
    expect(normalized.semantic).toBeCloseTo(0.25);
    expect(normalized.temporal).toBeCloseTo(0.20);
    expect(normalized.causal).toBeCloseTo(0.15);
    expect(normalized.narrative).toBeCloseTo(0.20);
  });

  it('normalizes empty object to default weights', () => {
    const normalized = normalizeWeights({});

    expect(normalized).toEqual(DEFAULT_WEIGHTS);
  });
});
