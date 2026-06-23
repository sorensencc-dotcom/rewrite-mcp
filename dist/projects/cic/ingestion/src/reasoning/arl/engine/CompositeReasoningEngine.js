"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCompositeReasoning = calculateCompositeReasoning;
const WeightingModel_1 = require("./WeightingModel");
function calculateCompositeReasoning(coherence, semantic, temporal, causal, narrative) {
    const coherenceScore = coherence.score || 0;
    const semanticScore = semantic.score || 0;
    const temporalScore = temporal.score || 0;
    const causalScore = causal.score || 0;
    const narrativeScore = narrative.score || 0;
    const overall = coherenceScore * WeightingModel_1.DEFAULT_WEIGHTS.coherence +
        semanticScore * WeightingModel_1.DEFAULT_WEIGHTS.semantic +
        temporalScore * WeightingModel_1.DEFAULT_WEIGHTS.temporal +
        causalScore * WeightingModel_1.DEFAULT_WEIGHTS.causal +
        narrativeScore * WeightingModel_1.DEFAULT_WEIGHTS.narrative;
    return {
        score: overall,
        details: `Weighted composite reasoning: coherence=${coherenceScore.toFixed(2)}, semantic=${semanticScore.toFixed(2)}, temporal=${temporalScore.toFixed(2)}, causal=${causalScore.toFixed(2)}, narrative=${narrativeScore.toFixed(2)}`,
        coherence: coherenceScore,
        semantic: semanticScore,
        temporal: temporalScore,
        causal: causalScore,
        narrative: narrativeScore,
        overall,
    };
}
//# sourceMappingURL=CompositeReasoningEngine.js.map