"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateConfidence = calculateConfidence;
const WeightingModel_1 = require("./WeightingModel");
function calculateConfidence(composite) {
    const weightedScore = composite.coherence * WeightingModel_1.DEFAULT_WEIGHTS.coherence +
        composite.semantic * WeightingModel_1.DEFAULT_WEIGHTS.semantic +
        composite.temporal * WeightingModel_1.DEFAULT_WEIGHTS.temporal +
        composite.causal * WeightingModel_1.DEFAULT_WEIGHTS.causal +
        composite.narrative * WeightingModel_1.DEFAULT_WEIGHTS.narrative;
    const threshold = 0.8;
    const decision = weightedScore > threshold ? 'APPROVED' : 'REVIEW_REQUIRED';
    return {
        score: weightedScore,
        weightedScore,
        details: `Confidence score: ${weightedScore.toFixed(2)} (${decision})`,
        reasoning: `Weighted reasoning score of ${weightedScore.toFixed(2)} ${weightedScore > threshold ? 'exceeds' : 'below'} approval threshold of ${threshold}`,
        threshold,
    };
}
//# sourceMappingURL=ConfidenceModel.js.map