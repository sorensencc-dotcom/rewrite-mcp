"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDriftImpact = computeDriftImpact;
function computeDriftImpact(semantic, temporal, narrative, causal, composite) {
    return {
        semanticDrift: 0,
        temporalDrift: 0,
        narrativeDrift: 0,
        causalDrift: 0,
        compositeDrift: 0,
        overall: 0
    };
}
//# sourceMappingURL=DriftImpactCalculator.js.map