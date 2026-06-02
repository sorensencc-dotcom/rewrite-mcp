import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { EvidenceScore } from './EvidenceScorer';
import { ContradictionAnalysis } from './ContradictionDetector';
import { ReasoningVerdict, ReasoningStep } from '../contracts/ReasoningVerdict';
import { SemanticAlignment } from '../contracts/SemanticAlignment';
import { CoherenceScore } from '../contracts/CoherenceScore';
import { TemporalConsistency } from '../contracts/TemporalConsistency';
import { CausalReasoning } from '../contracts/CausalReasoning';
import { NarrativeImpact } from '../contracts/NarrativeImpact';
import { CompositeReasoning } from '../contracts/CompositeReasoning';
import { ArlConfidence } from '../contracts/Confidence';
import { DriftImpact } from '../contracts/DriftImpact';

export function synthesizeVerdict(
  packet: ReasoningPacket,
  scores: EvidenceScore[],
  contradictions: ContradictionAnalysis,
  coherence: CoherenceScore,
  semantic: SemanticAlignment,
  temporal: TemporalConsistency,
  causal: CausalReasoning,
  narrative: NarrativeImpact,
  composite: CompositeReasoning,
  confidence: ArlConfidence,
  drift: DriftImpact
): ReasoningVerdict {
  if (scores.length === 0) {
    return {
      verdict: 'reject',
      confidence: 0,
      reasoningTrace: [],
      coherenceScore: coherence.overall,
      driftImpact: temporal.driftTemporalImpact,
      narrativeImpact: 'No hypotheses to evaluate',
      recommendedAction: 'reject'
    };
  }

  // Use coherence score from CoherenceEngine
  const coherenceScore = coherence.overall;

  // Use temporal drift impact from TemporalConsistencyEngine
  const driftImpact = temporal.driftTemporalImpact;

  // Determine verdict based on coherence and contradictions
  const verdict = determineVerdict(coherenceScore, contradictions.hasCritical);
  const confidence = calculateConfidence(
    coherenceScore,
    contradictions.contradictions.length
  );

  // Build reasoning trace
  const reasoningTrace = buildReasoningTrace(
    scores,
    contradictions,
    coherenceScore,
    causal,
    narrative
  );

  // Determine narrative impact
  const narrativeImpact = determineNarrativeImpact(
    scores,
    driftImpact,
    packet
  );

  return {
    verdict,
    confidence,
    reasoningTrace,
    coherenceScore,
    driftImpact,
    narrativeImpact,
    recommendedAction: verdict
  };
}

function determineVerdict(
  coherenceScore: number,
  hasCritical: boolean
): 'accept' | 'reject' | 'revise' {
  if (hasCritical) {
    return 'reject';
  }

  if (coherenceScore > 0.7) {
    return 'accept';
  }

  if (coherenceScore > 0.4) {
    return 'revise';
  }

  return 'reject';
}

function calculateConfidence(
  coherenceScore: number,
  contradictionCount: number
): number {
  // Confidence decreases with contradictions
  const contradictionPenalty = Math.min(0.5, contradictionCount * 0.1);
  return Math.max(0, coherenceScore - contradictionPenalty);
}

function buildReasoningTrace(
  scores: EvidenceScore[],
  contradictions: ContradictionAnalysis,
  coherenceScore: number,
  causal: CausalReasoning,
  narrative: NarrativeImpact
): ReasoningStep[] {
  const trace: ReasoningStep[] = [];

  // Add top-scoring hypothesis
  if (scores.length > 0) {
    const bestScore = scores.reduce((best, current) =>
      current.stabilityAlignment > best.stabilityAlignment ? current : best
    );

    trace.push({
      step: 'Hypothesis Evaluation',
      evidence: `Best hypothesis: "${bestScore.hypothesis.description.substring(0, 50)}..."`,
      score: bestScore.stabilityAlignment
    });
  }

  // Add contradiction findings
  contradictions.contradictions.slice(0, 3).forEach(c => {
    trace.push({
      step: 'Contradiction Detection',
      evidence: c.description,
      score: -c.severity
    });
  });

  // Add overall coherence
  trace.push({
    step: 'Coherence Analysis',
    evidence: `Overall coherence: ${(coherenceScore * 100).toFixed(1)}%`,
    score: coherenceScore
  });

  // Add causal reasoning findings
  if (causal.conflictCount > 0 || causal.missingPrerequisites.length > 0) {
    trace.push({
      step: 'Causal Analysis',
      evidence: `Causal strength: ${(causal.causalStrength * 100).toFixed(1)}%. Conflicts: ${causal.conflictCount}, Missing prerequisites: ${causal.missingPrerequisites.length}`,
      score: causal.overall
    });
  }

  // Add narrative impact findings
  if (narrative.reinforcementScore > 0 || narrative.contradictionScore > 0 || narrative.dilutionScore > 0) {
    trace.push({
      step: 'Narrative Impact Analysis',
      evidence: `Reinforcement: ${(narrative.reinforcementScore * 100).toFixed(1)}%. Contradiction: ${(narrative.contradictionScore * 100).toFixed(1)}%, Dilution: ${(narrative.dilutionScore * 100).toFixed(1)}%`,
      score: narrative.overall
    });
  }

  return trace;
}

function determineNarrativeImpact(
  scores: EvidenceScore[],
  driftImpact: number,
  packet: ReasoningPacket
): string {
  if (scores.length === 0) return 'No narrative impact (no evaluation)';

  const avgContinuity =
    scores.reduce((sum, s) => sum + s.narrativeContinuity, 0) / scores.length;

  if (driftImpact > 0.4) {
    return `High drift risk (${(driftImpact * 100).toFixed(1)}%). Narrative coherence: ${(avgContinuity * 100).toFixed(1)}%`;
  }

  if (avgContinuity < 0.3) {
    return `Poor narrative alignment. Consider revising candidate against narrative spine.`;
  }

  return `Acceptable narrative impact. Drift: ${(driftImpact * 100).toFixed(1)}%, Continuity: ${(avgContinuity * 100).toFixed(1)}%`;
}
