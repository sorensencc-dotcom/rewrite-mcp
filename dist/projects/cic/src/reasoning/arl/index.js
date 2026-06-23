"use strict";
/**
 * projects/cic/src/reasoning/arl/index.ts
 * Autonomous Reasoning Layer (ARL) entrypoint.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArlTraceAnalyzer = exports.getArlTraceStore = void 0;
exports.runArl = runArl;
const PremiseExtractor_js_1 = require("./engine/PremiseExtractor.js");
const HypothesisGenerator_js_1 = require("./engine/HypothesisGenerator.js");
const EvidenceScorer_js_1 = require("./engine/EvidenceScorer.js");
const ContradictionDetector_js_1 = require("./engine/ContradictionDetector.js");
const CoherenceEngine_js_1 = require("./engine/CoherenceEngine.js");
const SemanticAlignmentEngine_js_1 = require("./engine/SemanticAlignmentEngine.js");
const TemporalConsistencyEngine_js_1 = require("./engine/TemporalConsistencyEngine.js");
const CausalReasoningEngine_js_1 = require("./engine/CausalReasoningEngine.js");
const NarrativeImpactEngine_js_1 = require("./engine/NarrativeImpactEngine.js");
const CompositeReasoningEngine_js_1 = require("./engine/CompositeReasoningEngine.js");
const ConfidenceModel_js_1 = require("./engine/ConfidenceModel.js");
const DriftImpactCalculator_js_1 = require("./engine/DriftImpactCalculator.js");
const VerdictSynthesizer_js_1 = require("./engine/VerdictSynthesizer.js");
const ArlTraceStore_js_1 = require("./traces/ArlTraceStore.js");
var index_js_1 = require("./traces/index.js");
Object.defineProperty(exports, "getArlTraceStore", { enumerable: true, get: function () { return index_js_1.getArlTraceStore; } });
Object.defineProperty(exports, "ArlTraceAnalyzer", { enumerable: true, get: function () { return index_js_1.ArlTraceAnalyzer; } });
async function runArl(packet) {
    const premises = (0, PremiseExtractor_js_1.extractPremises)(packet);
    const hypotheses = (0, HypothesisGenerator_js_1.generateHypotheses)(premises);
    const scores = (0, EvidenceScorer_js_1.scoreEvidence)(packet, hypotheses);
    const contradictions = (0, ContradictionDetector_js_1.detectContradictions)(scores);
    const coherence = (0, CoherenceEngine_js_1.computeCoherence)(packet);
    const semantic = (0, SemanticAlignmentEngine_js_1.computeSemanticAlignment)(packet);
    const temporal = (0, TemporalConsistencyEngine_js_1.computeTemporalConsistency)(packet);
    const causal = (0, CausalReasoningEngine_js_1.computeCausalReasoning)(packet);
    const narrative = (0, NarrativeImpactEngine_js_1.computeNarrativeImpact)(packet);
    const composite = (0, CompositeReasoningEngine_js_1.computeCompositeReasoning)(coherence, semantic, temporal, causal, narrative);
    const confidence = (0, ConfidenceModel_js_1.computeArlConfidence)(composite);
    const drift = (0, DriftImpactCalculator_js_1.computeDriftImpact)(semantic, temporal, narrative, causal, composite);
    const verdict = (0, VerdictSynthesizer_js_1.synthesizeVerdict)(packet, scores, contradictions, coherence, semantic, temporal, causal, narrative, composite, confidence, drift);
    // Record verdict in trace store
    const store = (0, ArlTraceStore_js_1.getArlTraceStore)();
    store.record(packet, verdict);
    return verdict;
}
//# sourceMappingURL=index.js.map