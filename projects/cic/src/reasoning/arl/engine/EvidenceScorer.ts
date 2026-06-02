import { ReasoningPacket } from '../contracts/ReasoningPacket';
import { Hypothesis } from './HypothesisGenerator';

export interface EvidenceScore {
  hypothesis: Hypothesis;
  narrativeContinuity: number;
  semanticCoherence: number;
  timelineConsistency: number;
  driftPenalty: number;
  stabilityAlignment: number;
}

export function scoreEvidence(
  packet: ReasoningPacket,
  hypotheses: Hypothesis[]
): EvidenceScore[] {
  const { context } = packet;

  return hypotheses.map(hypothesis => ({
    hypothesis,
    narrativeContinuity: scoreNarrativeContinuity(
      hypothesis,
      context.narrativeSpine
    ),
    semanticCoherence: scoreSemanticCoherence(
      hypothesis,
      context.semanticMap
    ),
    timelineConsistency: scoreTimelineConsistency(
      hypothesis,
      context.recentExpansions
    ),
    driftPenalty: scoreDriftPenalty(hypothesis, context.driftScore),
    stabilityAlignment: scoreStabilityAlignment(
      hypothesis,
      context.stabilityMetrics
    )
  }));
}

function scoreNarrativeContinuity(hypothesis: Hypothesis, spine: string): number {
  // Check if hypothesis aligns with narrative spine
  const spineWords = spine.toLowerCase().split(/\s+/);
  const hypWords = hypothesis.description.toLowerCase().split(/\s+/);

  const overlap = hypWords.filter(w => spineWords.includes(w)).length;
  const score = Math.min(1, overlap / Math.max(1, hypWords.length));

  return score;
}

function scoreSemanticCoherence(hypothesis: Hypothesis, semanticMap: Record<string, any>): number {
  // Check consistency with semantic relationships
  const semanticKeys = Object.keys(semanticMap);
  const hypLower = hypothesis.description.toLowerCase();

  let matches = 0;
  semanticKeys.forEach(key => {
    if (hypLower.includes(key.toLowerCase())) {
      matches++;
    }
  });

  const score = Math.min(1, matches / Math.max(1, semanticKeys.length));
  return score;
}

function scoreTimelineConsistency(hypothesis: Hypothesis, recentExpansions: any[]): number {
  // Check if hypothesis respects temporal ordering
  if (recentExpansions.length === 0) return 0.5;

  const hypLower = hypothesis.description.toLowerCase();

  // Simple heuristic: if hypothesis mentions recent terms, boost score
  let relevantMentions = 0;
  recentExpansions.forEach(exp => {
    const expStr = JSON.stringify(exp).toLowerCase();
    if (expStr.includes(hypLower)) {
      relevantMentions++;
    }
  });

  return Math.min(1, relevantMentions / Math.max(1, recentExpansions.length));
}

function scoreDriftPenalty(hypothesis: Hypothesis, driftScore: number): number {
  // Hypothesis that introduces high drift should score lower
  // Hypothesis closer to current drift level scores higher
  const driftPenalty = Math.abs(driftScore - 0.5);
  return 1 - driftPenalty;
}

function scoreStabilityAlignment(hypothesis: Hypothesis, stabilityMetrics: Record<string, any>): number {
  // Check alignment with stability constraints
  const stability = stabilityMetrics.overallStability || 0.5;
  const targetStability = 0.7; // Hypotheses should increase stability

  // Score based on how much hypothesis helps stability
  const delta = stability - targetStability;
  const alignment = Math.max(0, 1 - Math.abs(delta));

  return alignment;
}
