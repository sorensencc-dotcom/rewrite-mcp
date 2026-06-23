"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeArlConfidence = computeArlConfidence;
function computeArlConfidence(composite) {
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