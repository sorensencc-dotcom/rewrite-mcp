import { describe, it, expect } from '@jest/globals';
import { formatReasoningTrace } from '../../src/reasoning/arl/engine/ReasoningTraceFormatter';
import {
  CoherenceScore,
  SemanticAlignment,
  TemporalConsistency,
  CausalReasoning,
  NarrativeImpact,
  CompositeReasoning,
  ArlConfidence,
  DriftImpact,
} from '../../src/reasoning/arl/contracts/index';

describe('ReasoningTraceFormatter', () => {
  it('should return exactly 8 trace steps in deterministic order', () => {
    const coherence: CoherenceScore = {
      score: 0.95,
      details: 'Coherence analysis passed',
    };
    const semantic: SemanticAlignment = {
      score: 0.88,
      details: 'Semantic alignment verified',
    };
    const temporal: TemporalConsistency = {
      score: 0.92,
      details: 'Temporal consistency confirmed',
    };
    const causal: CausalReasoning = {
      score: 0.85,
      details: 'Causal chain established',
    };
    const narrative: NarrativeImpact = {
      score: 0.90,
      details: 'Narrative impact evaluated',
    };
    const composite: CompositeReasoning = {
      score: 0.89,
      details: 'Composite reasoning synthesized',
    };
    const confidence: ArlConfidence = {
      score: 0.91,
      details: 'Confidence threshold met',
    };
    const drift: DriftImpact = {
      score: 0.12,
      details: 'Minimal drift detected',
    };

    const trace = formatReasoningTrace(
      coherence,
      semantic,
      temporal,
      causal,
      narrative,
      composite,
      confidence,
      drift
    );

    expect(trace).toHaveLength(8);
    expect(trace[0].subsystem).toBe('coherence');
    expect(trace[1].subsystem).toBe('semantic');
    expect(trace[2].subsystem).toBe('temporal');
    expect(trace[3].subsystem).toBe('causal');
    expect(trace[4].subsystem).toBe('narrative');
    expect(trace[5].subsystem).toBe('composite');
    expect(trace[6].subsystem).toBe('confidence');
    expect(trace[7].subsystem).toBe('drift');
  });

  it('should correctly populate score and summary for each trace step', () => {
    const coherence: CoherenceScore = {
      score: 0.95,
      details: 'Coherence analysis passed',
    };
    const semantic: SemanticAlignment = {
      score: 0.88,
      details: 'Semantic alignment verified',
    };
    const temporal: TemporalConsistency = {
      score: 0.92,
      details: 'Temporal consistency confirmed',
    };
    const causal: CausalReasoning = {
      score: 0.85,
      details: 'Causal chain established',
    };
    const narrative: NarrativeImpact = {
      score: 0.90,
      details: 'Narrative impact evaluated',
    };
    const composite: CompositeReasoning = {
      score: 0.89,
      details: 'Composite reasoning synthesized',
    };
    const confidence: ArlConfidence = {
      score: 0.91,
      details: 'Confidence threshold met',
    };
    const drift: DriftImpact = {
      score: 0.12,
      details: 'Minimal drift detected',
    };

    const trace = formatReasoningTrace(
      coherence,
      semantic,
      temporal,
      causal,
      narrative,
      composite,
      confidence,
      drift
    );

    expect(trace[0]).toEqual({
      subsystem: 'coherence',
      summary: 'Coherence analysis passed',
      score: 0.95,
    });
    expect(trace[1]).toEqual({
      subsystem: 'semantic',
      summary: 'Semantic alignment verified',
      score: 0.88,
    });
    expect(trace[2]).toEqual({
      subsystem: 'temporal',
      summary: 'Temporal consistency confirmed',
      score: 0.92,
    });
    expect(trace[3]).toEqual({
      subsystem: 'causal',
      summary: 'Causal chain established',
      score: 0.85,
    });
    expect(trace[4]).toEqual({
      subsystem: 'narrative',
      summary: 'Narrative impact evaluated',
      score: 0.90,
    });
    expect(trace[5]).toEqual({
      subsystem: 'composite',
      summary: 'Composite reasoning synthesized',
      score: 0.89,
    });
    expect(trace[6]).toEqual({
      subsystem: 'confidence',
      summary: 'Confidence threshold met',
      score: 0.91,
    });
    expect(trace[7]).toEqual({
      subsystem: 'drift',
      summary: 'Minimal drift detected',
      score: 0.12,
    });
  });

  it('should handle edge case scores (0 and 1)', () => {
    const zeroScores = {
      score: 0,
      details: 'Zero detail',
    };
    const maxScores = {
      score: 1,
      details: 'Max detail',
    };

    const trace = formatReasoningTrace(
      maxScores,
      zeroScores,
      maxScores,
      zeroScores,
      maxScores,
      zeroScores,
      maxScores,
      zeroScores
    );

    expect(trace[0].score).toBe(1);
    expect(trace[1].score).toBe(0);
    expect(trace[2].score).toBe(1);
    expect(trace[3].score).toBe(0);
  });
});
