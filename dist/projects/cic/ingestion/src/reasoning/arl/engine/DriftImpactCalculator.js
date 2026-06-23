"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDriftImpact = calculateDriftImpact;
const WeightingModel_1 = require("./WeightingModel");
function calculateDriftImpact(driftInput) {
    const semanticDrift = driftInput.semanticDrift || 0;
    const temporalDrift = driftInput.temporalDrift || 0;
    const narrativeDrift = driftInput.narrativeDrift || 0;
    const causalDrift = driftInput.causalDrift || 0;
    const compositeDrift = driftInput.compositeDrift || 0;
    const overall = semanticDrift * WeightingModel_1.DEFAULT_WEIGHTS.semantic +
        temporalDrift * WeightingModel_1.DEFAULT_WEIGHTS.temporal +
        narrativeDrift * WeightingModel_1.DEFAULT_WEIGHTS.narrative +
        causalDrift * WeightingModel_1.DEFAULT_WEIGHTS.causal +
        compositeDrift * 0.2;
    return {
        score: overall,
        details: `Weighted drift impact: semantic=${semanticDrift.toFixed(2)}, temporal=${temporalDrift.toFixed(2)}, narrative=${narrativeDrift.toFixed(2)}, causal=${causalDrift.toFixed(2)}, composite=${compositeDrift.toFixed(2)}`,
        semanticDrift,
        temporalDrift,
        narrativeDrift,
        causalDrift,
        compositeDrift,
        overall,
    };
}
//# sourceMappingURL=DriftImpactCalculator.js.map