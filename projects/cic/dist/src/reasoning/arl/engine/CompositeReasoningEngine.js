export function computeCompositeReasoning(coherence, semantic, temporal, causal, narrative) {
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