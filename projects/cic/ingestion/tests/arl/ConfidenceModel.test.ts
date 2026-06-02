import { describe, it, expect } from '@jest/globals';
import { calculateConfidence } from '../../src/reasoning/arl/engine/ConfidenceModel';

describe('ConfidenceModel', () => {
  it('calculates confidence above threshold', () => {
    const composite = {
      score: 0.85,
      details: 'Test',
      coherence: 0.95,
      semantic: 0.88,
      temporal: 0.92,
      causal: 0.85,
      narrative: 0.90,
      overall: 0.90,
    };

    const confidence = calculateConfidence(composite);

    expect(confidence.score).toBeCloseTo(0.90, 5);
    expect(confidence.weightedScore).toBeCloseTo(0.90, 5);
    expect(confidence.threshold).toBe(0.8);
    expect(confidence.reasoning).toContain('exceeds');
  });

  it('calculates confidence below threshold', () => {
    const composite = {
      score: 0.70,
      details: 'Test',
      coherence: 0.50,
      semantic: 0.60,
      temporal: 0.70,
      causal: 0.65,
      narrative: 0.68,
      overall: 0.625,
    };

    const confidence = calculateConfidence(composite);

    expect(confidence.score).toBeLessThan(0.8);
    expect(confidence.reasoning).toContain('below');
  });

  it('returns deterministic threshold', () => {
    const composite = {
      score: 0,
      details: 'Test',
      coherence: 0,
      semantic: 0,
      temporal: 0,
      causal: 0,
      narrative: 0,
      overall: 0,
    };

    const confidence = calculateConfidence(composite);

    expect(confidence.threshold).toBe(0.8);
  });
});
