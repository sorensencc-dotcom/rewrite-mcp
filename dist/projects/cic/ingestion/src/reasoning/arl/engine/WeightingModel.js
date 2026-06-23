"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WEIGHTS = void 0;
exports.validateWeights = validateWeights;
exports.normalizeWeights = normalizeWeights;
exports.DEFAULT_WEIGHTS = {
    coherence: 0.20,
    semantic: 0.25,
    temporal: 0.20,
    causal: 0.15,
    narrative: 0.20,
};
function validateWeights(weights) {
    const total = weights.coherence +
        weights.semantic +
        weights.temporal +
        weights.causal +
        weights.narrative;
    return Math.abs(total - 1.0) < 0.0001;
}
function normalizeWeights(weights) {
    const merged = { ...exports.DEFAULT_WEIGHTS, ...weights };
    const total = merged.coherence +
        merged.semantic +
        merged.temporal +
        merged.causal +
        merged.narrative;
    if (total === 0)
        return exports.DEFAULT_WEIGHTS;
    return {
        coherence: merged.coherence / total,
        semantic: merged.semantic / total,
        temporal: merged.temporal / total,
        causal: merged.causal / total,
        narrative: merged.narrative / total,
    };
}
//# sourceMappingURL=WeightingModel.js.map