export function computeArlConfidence(composite) {
    return {
        weightedScore: 0,
        factors: {
            coherence: composite.coherence,
            semantic: composite.semantic,
            temporal: composite.temporal,
            causal: composite.causal,
            narrative: composite.narrative
        }
    };
}
//# sourceMappingURL=ConfidenceModel.js.map