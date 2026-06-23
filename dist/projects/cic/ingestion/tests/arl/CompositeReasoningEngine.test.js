"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CompositeReasoningEngine_1 = require("../../src/reasoning/arl/engine/CompositeReasoningEngine");
const WeightingModel_1 = require("../../src/reasoning/arl/engine/WeightingModel");
(0, globals_1.describe)('CompositeReasoningEngine', () => {
    (0, globals_1.it)('calculates weighted composite from subsystem scores', () => {
        const coherence = { score: 0.95, details: 'Coherent' };
        const semantic = { score: 0.88, details: 'Semantic' };
        const temporal = { score: 0.92, details: 'Temporal' };
        const causal = { score: 0.85, details: 'Causal' };
        const narrative = { score: 0.90, details: 'Narrative' };
        const composite = (0, CompositeReasoningEngine_1.calculateCompositeReasoning)(coherence, semantic, temporal, causal, narrative);
        const expectedOverall = 0.95 * WeightingModel_1.DEFAULT_WEIGHTS.coherence +
            0.88 * WeightingModel_1.DEFAULT_WEIGHTS.semantic +
            0.92 * WeightingModel_1.DEFAULT_WEIGHTS.temporal +
            0.85 * WeightingModel_1.DEFAULT_WEIGHTS.causal +
            0.90 * WeightingModel_1.DEFAULT_WEIGHTS.narrative;
        (0, globals_1.expect)(composite.overall).toBeCloseTo(expectedOverall, 5);
        (0, globals_1.expect)(composite.score).toBeCloseTo(expectedOverall, 5);
        (0, globals_1.expect)(composite.coherence).toBe(0.95);
        (0, globals_1.expect)(composite.semantic).toBe(0.88);
        (0, globals_1.expect)(composite.temporal).toBe(0.92);
        (0, globals_1.expect)(composite.causal).toBe(0.85);
        (0, globals_1.expect)(composite.narrative).toBe(0.90);
    });
    (0, globals_1.it)('handles zero scores without error', () => {
        const coherence = { score: 0, details: 'Zero' };
        const semantic = { score: 0, details: 'Zero' };
        const temporal = { score: 0, details: 'Zero' };
        const causal = { score: 0, details: 'Zero' };
        const narrative = { score: 0, details: 'Zero' };
        const composite = (0, CompositeReasoningEngine_1.calculateCompositeReasoning)(coherence, semantic, temporal, causal, narrative);
        (0, globals_1.expect)(composite.overall).toBe(0);
    });
    (0, globals_1.it)('handles perfect scores', () => {
        const coherence = { score: 1, details: 'Perfect' };
        const semantic = { score: 1, details: 'Perfect' };
        const temporal = { score: 1, details: 'Perfect' };
        const causal = { score: 1, details: 'Perfect' };
        const narrative = { score: 1, details: 'Perfect' };
        const composite = (0, CompositeReasoningEngine_1.calculateCompositeReasoning)(coherence, semantic, temporal, causal, narrative);
        (0, globals_1.expect)(composite.overall).toBeCloseTo(1, 5);
    });
});
//# sourceMappingURL=CompositeReasoningEngine.test.js.map