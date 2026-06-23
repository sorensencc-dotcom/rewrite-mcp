/**
 * projects/cic/src/reasoning/arl/index.ts
 * Autonomous Reasoning Layer (ARL) entrypoint.
 */
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
import { computeArlConfidence } from './engine/ConfidenceModel.js';
import { computeDriftImpact } from './engine/DriftImpactCalculator.js';
import { synthesizeVerdict } from './engine/VerdictSynthesizer.js';
import { getArlTraceStore } from './traces/ArlTraceStore.js';
export { getArlTraceStore, ArlTraceAnalyzer } from './traces/index.js';
export async function runArl(packet) {
    const premises = extractPremises(packet);
    const hypotheses = generateHypotheses(premises);
    const scores = scoreEvidence(packet, hypotheses);
    const contradictions = detectContradictions(scores);
    const coherence = computeCoherence(packet);
    const semantic = computeSemanticAlignment(packet);
    const temporal = computeTemporalConsistency(packet);
    const causal = computeCausalReasoning(packet);
    const narrative = computeNarrativeImpact(packet);
    const composite = computeCompositeReasoning(coherence, semantic, temporal, causal, narrative);
    const confidence = computeArlConfidence(composite);
    const drift = computeDriftImpact(semantic, temporal, narrative, causal, composite);
    const verdict = synthesizeVerdict(packet, scores, contradictions, coherence, semantic, temporal, causal, narrative, composite, confidence, drift);
    // Record verdict in trace store
    const store = getArlTraceStore();
    store.record(packet, verdict);
    return verdict;
}
//# sourceMappingURL=index.js.map