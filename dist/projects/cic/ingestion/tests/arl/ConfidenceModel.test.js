"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ConfidenceModel_1 = require("../../src/reasoning/arl/engine/ConfidenceModel");
(0, globals_1.describe)('ConfidenceModel', () => {
    (0, globals_1.it)('calculates confidence above threshold', () => {
        const composite = {
            score: 0.85,
            details: 'Test',
            coherence: 0.95,
            semantic: 0.88,
            temporal: 0.92,
            causal: 0.85,
            narrative: 0.90,
            overall: 0.90,
        };
        const confidence = (0, ConfidenceModel_1.calculateConfidence)(composite);
        (0, globals_1.expect)(confidence.score).toBeCloseTo(0.90, 5);
        (0, globals_1.expect)(confidence.weightedScore).toBeCloseTo(0.90, 5);
        (0, globals_1.expect)(confidence.threshold).toBe(0.8);
        (0, globals_1.expect)(confidence.reasoning).toContain('exceeds');
    });
    (0, globals_1.it)('calculates confidence below threshold', () => {
        const composite = {
            score: 0.70,
            details: 'Test',
            coherence: 0.50,
            semantic: 0.60,
            temporal: 0.70,
            causal: 0.65,
            narrative: 0.68,
            overall: 0.625,
        };
        const confidence = (0, ConfidenceModel_1.calculateConfidence)(composite);
        (0, globals_1.expect)(confidence.score).toBeLessThan(0.8);
        (0, globals_1.expect)(confidence.reasoning).toContain('below');
    });
    (0, globals_1.it)('returns deterministic threshold', () => {
        const composite = {
            score: 0,
            details: 'Test',
            coherence: 0,
            semantic: 0,
            temporal: 0,
            causal: 0,
            narrative: 0,
            overall: 0,
        };
        const confidence = (0, ConfidenceModel_1.calculateConfidence)(composite);
        (0, globals_1.expect)(confidence.threshold).toBe(0.8);
    });
});
//# sourceMappingURL=ConfidenceModel.test.js.map