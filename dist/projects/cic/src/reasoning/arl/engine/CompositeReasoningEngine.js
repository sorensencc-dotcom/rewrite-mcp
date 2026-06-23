"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCompositeReasoning = computeCompositeReasoning;
function computeCompositeReasoning(coherence, semantic, temporal, causal, narrative) {
    return {
        coherence: coherence.overall,
        semantic: semantic.overall,
        temporal: temporal.overall,
        causal: causal.overall,
        narrative: narrative.overall,
        overall: 0
    };
}
//# sourceMappingURL=CompositeReasoningEngine.js.map