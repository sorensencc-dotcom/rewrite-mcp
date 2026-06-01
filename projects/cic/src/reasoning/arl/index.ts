/**
 * projects/cic/src/reasoning/arl/index.ts
 * Autonomous Reasoning Layer (ARL) entrypoint.
 */

import { ReasoningPacket } from './contracts/ReasoningPacket.js';
import { ReasoningVerdict } from './contracts/ReasoningVerdict.js';
import { extractPremises } from './engine/PremiseExtractor.js';
import { generateHypotheses } from './engine/HypothesisGenerator.js';
import { scoreEvidence } from './engine/EvidenceScorer.js';
import { detectContradictions } from './engine/ContradictionDetector.js';
import { synthesizeVerdict } from './engine/VerdictSynthesizer.js';

export { ArlCandidate, ArlContext, ReasoningPacket } from './contracts/ReasoningPacket.js';
export { ArlVerdictType, ReasoningStep, ReasoningVerdict } from './contracts/ReasoningVerdict.js';

export async function runArl(packet: ReasoningPacket): Promise<ReasoningVerdict> {
  const premises = extractPremises(packet);
  const hypotheses = generateHypotheses(premises);
  const scores = scoreEvidence(packet, hypotheses);
  const contradictions = detectContradictions(scores);
  return synthesizeVerdict(packet, scores, contradictions);
}
