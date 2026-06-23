"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ConfidenceModel_1 = require("../../src/reasoning/arl/engine/ConfidenceModel");
(0, vitest_1.describe)('ConfidenceModel', () => {
    (0, vitest_1.it)('returns deterministic structure with mirrored factors', () => {
        const composite = {
            coherence: 0.1,
            semantic: 0.2,
            temporal: 0.3,
            causal: 0.4,
            narrative: 0.5,
            overall: 0.6
        };
        const result = (0, ConfidenceModel_1.computeArlConfidence)(composite);
        (0, vitest_1.expect)(result).toEqual({
            weightedScore: 0,
            factors: {
                coherence: 0.1,
                semantic: 0.2,
                temporal: 0.3,
                causal: 0.4,
                narrative: 0.5
            }
        });
    });
});
//# sourceMappingURL=ConfidenceModel.test.js.map