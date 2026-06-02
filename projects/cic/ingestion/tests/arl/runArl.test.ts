import { describe, it, expect } from '@jest/globals';
import { runArl, ArlInput } from '../../src/reasoning/arl/index';

describe('runArl Integration', () => {
  it('should execute full ARL pipeline and include reasoning trace in verdict', async () => {
    const input: ArlInput = {
      coherence: {
        score: 0.95,
        details: 'Coherence analysis passed with high confidence',
      },
      semantic: {
        score: 0.88,
        details: 'Semantic alignment verified across all dimensions',
      },
      temporal: {
        score: 0.92,
        details: 'Temporal consistency confirmed throughout evaluation',
      },
      causal: {
        score: 0.85,
        details: 'Causal chain established with logical foundation',
      },
      narrative: {
        score: 0.90,
        details: 'Narrative impact evaluated as significant',
      },
      composite: {
        score: 0.89,
        details: 'Composite reasoning synthesized successfully',
      },
      confidence: {
        score: 0.91,
        details: 'Confidence threshold met with 91% certainty',
      },
      drift: {
        score: 0.12,
        details: 'Minimal drift detected in reasoning chain',
      },
    };

    const verdict = await runArl(input);

    expect(verdict).toBeDefined();
    expect(verdict.decision).toBe('APPROVED');
    expect(verdict.confidence).toBe(0.91);
    expect(verdict.reasoning).toContain('Composite reasoning synthesized successfully');
    expect(verdict.reasoningTrace).toBeDefined();
    expect(verdict.reasoningTrace).toHaveLength(8);
  });

  it('should set decision to REVIEW_REQUIRED when confidence is below threshold', async () => {
    const input: ArlInput = {
      coherence: { score: 0.5, details: 'Low coherence' },
      semantic: { score: 0.5, details: 'Low semantic alignment' },
      temporal: { score: 0.5, details: 'Low temporal consistency' },
      causal: { score: 0.5, details: 'Low causal reasoning' },
      narrative: { score: 0.5, details: 'Low narrative impact' },
      composite: { score: 0.5, details: 'Low composite score' },
      confidence: { score: 0.6, details: 'Below confidence threshold' },
      drift: { score: 0.5, details: 'High drift detected' },
    };

    const verdict = await runArl(input);

    expect(verdict.decision).toBe('REVIEW_REQUIRED');
    expect(verdict.confidence).toBe(0.6);
  });

  it('should include all 8 subsystems in trace in correct order', async () => {
    const input: ArlInput = {
      coherence: { score: 0.9, details: 'Coherence' },
      semantic: { score: 0.9, details: 'Semantic' },
      temporal: { score: 0.9, details: 'Temporal' },
      causal: { score: 0.9, details: 'Causal' },
      narrative: { score: 0.9, details: 'Narrative' },
      composite: { score: 0.9, details: 'Composite' },
      confidence: { score: 0.9, details: 'Confidence' },
      drift: { score: 0.9, details: 'Drift' },
    };

    const verdict = await runArl(input);

    const subsystems = verdict.reasoningTrace!.map((step) => step.subsystem);
    expect(subsystems).toEqual([
      'coherence',
      'semantic',
      'temporal',
      'causal',
      'narrative',
      'composite',
      'confidence',
      'drift',
    ]);
  });
});
