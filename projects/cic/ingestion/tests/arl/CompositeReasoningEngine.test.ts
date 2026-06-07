import { describe, it, expect } from '@jest/globals';
import { calculateCompositeReasoning } from '../../src/reasoning/arl/engine/CompositeReasoningEngine';
import { DEFAULT_WEIGHTS } from '../../src/reasoning/arl/engine/WeightingModel';

describe('CompositeReasoningEngine', () => {
  it('calculates weighted composite from subsystem scores', () => {
    const coherence = { score: 0.95, details: 'Coherent' };
    const semantic = { score: 0.88, details: 'Semantic' };
    const temporal = { score: 0.92, details: 'Temporal' };
    const causal = { score: 0.85, details: 'Causal' };
    const narrative = { score: 0.90, details: 'Narrative' };

    const composite = calculateCompositeReasoning(
      coherence,
      semantic,
      temporal,
      causal,
      narrative
    );

    const expectedOverall =
      0.95 * DEFAULT_WEIGHTS.coherence +
      0.88 * DEFAULT_WEIGHTS.semantic +
      0.92 * DEFAULT_WEIGHTS.temporal +
      0.85 * DEFAULT_WEIGHTS.causal +
      0.90 * DEFAULT_WEIGHTS.narrative;

    expect(composite.overall).toBeCloseTo(expectedOverall, 5);
    expect(composite.score).toBeCloseTo(expectedOverall, 5);
    expect(composite.coherence).toBe(0.95);
    expect(composite.semantic).toBe(0.88);
    expect(composite.temporal).toBe(0.92);
    expect(composite.causal).toBe(0.85);
    expect(composite.narrative).toBe(0.90);
  });

  it('handles zero scores without error', () => {
    const coherence = { score: 0, details: 'Zero' };
    const semantic = { score: 0, details: 'Zero' };
    const temporal = { score: 0, details: 'Zero' };
    const causal = { score: 0, details: 'Zero' };
    const narrative = { score: 0, details: 'Zero' };

    const composite = calculateCompositeReasoning(
      coherence,
      semantic,
      temporal,
      causal,
      narrative
    );

    expect(composite.overall).toBe(0);
  });

  it('handles perfect scores', () => {
    const coherence = { score: 1, details: 'Perfect' };
    const semantic = { score: 1, details: 'Perfect' };
    const temporal = { score: 1, details: 'Perfect' };
    const causal = { score: 1, details: 'Perfect' };
    const narrative = { score: 1, details: 'Perfect' };

    const composite = calculateCompositeReasoning(
      coherence,
      semantic,
      temporal,
      causal,
      narrative
    );

    expect(composite.overall).toBeCloseTo(1, 5);
  });
});
