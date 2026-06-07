import { describe, it, expect } from '@jest/globals';
import { calculateDriftImpact } from '../../src/reasoning/arl/engine/DriftImpactCalculator';
import { DEFAULT_WEIGHTS } from '../../src/reasoning/arl/engine/WeightingModel';

describe('DriftImpactCalculator', () => {
  it('calculates weighted drift from signal drifts', () => {
    const driftInput = {
      semanticDrift: 0.05,
      temporalDrift: 0.08,
      narrativeDrift: 0.03,
      causalDrift: 0.12,
      compositeDrift: 0.07,
    };

    const drift = calculateDriftImpact(driftInput);

    const expectedOverall =
      0.05 * DEFAULT_WEIGHTS.semantic +
      0.08 * DEFAULT_WEIGHTS.temporal +
      0.03 * DEFAULT_WEIGHTS.narrative +
      0.12 * DEFAULT_WEIGHTS.causal +
      0.07 * 0.2;

    expect(drift.overall).toBeCloseTo(expectedOverall, 5);
    expect(drift.score).toBeCloseTo(expectedOverall, 5);
    expect(drift.semanticDrift).toBe(0.05);
    expect(drift.temporalDrift).toBe(0.08);
    expect(drift.narrativeDrift).toBe(0.03);
    expect(drift.causalDrift).toBe(0.12);
    expect(drift.compositeDrift).toBe(0.07);
  });

  it('handles zero drift', () => {
    const driftInput = {
      semanticDrift: 0,
      temporalDrift: 0,
      narrativeDrift: 0,
      causalDrift: 0,
      compositeDrift: 0,
    };

    const drift = calculateDriftImpact(driftInput);

    expect(drift.overall).toBe(0);
  });

  it('handles missing drift fields with defaults', () => {
    const driftInput = {};

    const drift = calculateDriftImpact(driftInput);

    expect(drift.semanticDrift).toBe(0);
    expect(drift.temporalDrift).toBe(0);
    expect(drift.narrativeDrift).toBe(0);
    expect(drift.causalDrift).toBe(0);
    expect(drift.compositeDrift).toBe(0);
    expect(drift.overall).toBe(0);
  });

  it('composite drift gets fixed 0.2 stabilizer weight', () => {
    const driftInput = {
      semanticDrift: 0,
      temporalDrift: 0,
      narrativeDrift: 0,
      causalDrift: 0,
      compositeDrift: 1,
    };

    const drift = calculateDriftImpact(driftInput);

    expect(drift.overall).toBeCloseTo(1 * 0.2, 5);
  });
});
