"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const WeightingModel_1 = require("../../src/reasoning/arl/engine/WeightingModel");
(0, globals_1.describe)('WeightingModel', () => {
    (0, globals_1.it)('defines deterministic default weights', () => {
        (0, globals_1.expect)(WeightingModel_1.DEFAULT_WEIGHTS).toEqual({
            coherence: 0.20,
            semantic: 0.25,
            temporal: 0.20,
            causal: 0.15,
            narrative: 0.20,
        });
    });
    (0, globals_1.it)('validates weights sum to 1.0', () => {
        (0, globals_1.expect)((0, WeightingModel_1.validateWeights)(WeightingModel_1.DEFAULT_WEIGHTS)).toBe(true);
    });
    (0, globals_1.it)('rejects weights that do not sum to 1.0', () => {
        const invalid = {
            coherence: 0.25,
            semantic: 0.25,
            temporal: 0.25,
            causal: 0.15,
            narrative: 0.15,
        };
        (0, globals_1.expect)((0, WeightingModel_1.validateWeights)(invalid)).toBe(false);
    });
    (0, globals_1.it)('normalizes partial weights to sum to 1.0', () => {
        const partial = {
            coherence: 2,
            semantic: 2.5,
            temporal: 2,
            causal: 1.5,
            narrative: 2,
        };
        const normalized = (0, WeightingModel_1.normalizeWeights)(partial);
        (0, globals_1.expect)((0, WeightingModel_1.validateWeights)(normalized)).toBe(true);
        (0, globals_1.expect)(normalized.coherence).toBeCloseTo(0.20);
        (0, globals_1.expect)(normalized.semantic).toBeCloseTo(0.25);
        (0, globals_1.expect)(normalized.temporal).toBeCloseTo(0.20);
        (0, globals_1.expect)(normalized.causal).toBeCloseTo(0.15);
        (0, globals_1.expect)(normalized.narrative).toBeCloseTo(0.20);
    });
    (0, globals_1.it)('normalizes empty object to default weights', () => {
        const normalized = (0, WeightingModel_1.normalizeWeights)({});
        (0, globals_1.expect)(normalized).toEqual(WeightingModel_1.DEFAULT_WEIGHTS);
    });
});
//# sourceMappingURL=WeightingModel.test.js.map