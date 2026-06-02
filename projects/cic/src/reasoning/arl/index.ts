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
import { computeCoherence } from './engine/CoherenceEngine.js';
import { computeSemanticAlignment } from './engine/SemanticAlignmentEngine.js';
import { computeTemporalConsistency } from './engine/TemporalConsistencyEngine.js';
import { computeCausalReasoning } from './engine/CausalReasoningEngine.js';
import { computeNarrativeImpact } from './engine/NarrativeImpactEngine.js';
import { computeCompositeReasoning } from './engine/CompositeReasoningEngine.js';
import { synthesizeVerdict } from './engine/VerdictSynthesizer.js';
import { getArlTraceStore, ArlTraceRecord, ArlTraceQuery, ArlTraceStatistics } from './traces/ArlTraceStore.js';

export { ArlCandidate, ArlContext, ReasoningPacket } from './contracts/ReasoningPacket.js';
export { ArlVerdictType, ReasoningStep, ReasoningVerdict } from './contracts/ReasoningVerdict.js';
export { CoherenceScore } from './contracts/CoherenceScore.js';
export { SemanticAlignment } from './contracts/SemanticAlignment.js';
export { TemporalConsistency } from './contracts/TemporalConsistency.js';
export { CausalReasoning } from './contracts/CausalReasoning.js';
export { NarrativeImpact } from './contracts/NarrativeImpact.js';
export { CompositeReasoning } from './contracts/CompositeReasoning.js';
export {
  ArlTraceRecord,
  ArlTraceQuery,
  ArlTraceStatistics,
  getArlTraceStore,
  ArlTraceAnalyzer
} from './traces/index.js';

export async function runArl(packet: ReasoningPacket): Promise<ReasoningVerdict> {
  const premises = extractPremises(packet);
  const hypotheses = generateHypotheses(premises);
  const scores = scoreEvidence(packet, hypotheses);
  const contradictions = detectContradictions(scores);
  const coherence = computeCoherence(packet);
  const semantic = computeSemanticAlignment(packet);
  const temporal = computeTemporalConsistency(packet);
  const causal = computeCausalReasoning(packet);
  const narrative = computeNarrativeImpact(packet);

  const composite = computeCompositeReasoning(
    coherence,
    semantic,
    temporal,
    causal,
    narrative
  );

  const verdict = synthesizeVerdict(
    packet,
    scores,
    contradictions,
    coherence,
    semantic,
    temporal,
    causal,
    narrative,
    composite
  );

  // Record verdict in trace store
  const store = getArlTraceStore();
  store.record(packet, verdict);

  return verdict;
}
