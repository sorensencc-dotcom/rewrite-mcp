"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DriftImpactCalculator_1 = require("../../src/reasoning/arl/engine/DriftImpactCalculator");
const WeightingModel_1 = require("../../src/reasoning/arl/engine/WeightingModel");
(0, globals_1.describe)('DriftImpactCalculator', () => {
    (0, globals_1.it)('calculates weighted drift from signal drifts', () => {
        const driftInput = {
            semanticDrift: 0.05,
            temporalDrift: 0.08,
            narrativeDrift: 0.03,
            causalDrift: 0.12,
            compositeDrift: 0.07,
        };
        const drift = (0, DriftImpactCalculator_1.calculateDriftImpact)(driftInput);
        const expectedOverall = 0.05 * WeightingModel_1.DEFAULT_WEIGHTS.semantic +
            0.08 * WeightingModel_1.DEFAULT_WEIGHTS.temporal +
            0.03 * WeightingModel_1.DEFAULT_WEIGHTS.narrative +
            0.12 * WeightingModel_1.DEFAULT_WEIGHTS.causal +
            0.07 * 0.2;
        (0, globals_1.expect)(drift.overall).toBeCloseTo(expectedOverall, 5);
        (0, globals_1.expect)(drift.score).toBeCloseTo(expectedOverall, 5);
        (0, globals_1.expect)(drift.semanticDrift).toBe(0.05);
        (0, globals_1.expect)(drift.temporalDrift).toBe(0.08);
        (0, globals_1.expect)(drift.narrativeDrift).toBe(0.03);
        (0, globals_1.expect)(drift.causalDrift).toBe(0.12);
        (0, globals_1.expect)(drift.compositeDrift).toBe(0.07);
    });
    (0, globals_1.it)('handles zero drift', () => {
        const driftInput = {
            semanticDrift: 0,
            temporalDrift: 0,
            narrativeDrift: 0,
            causalDrift: 0,
            compositeDrift: 0,
        };
        const drift = (0, DriftImpactCalculator_1.calculateDriftImpact)(driftInput);
        (0, globals_1.expect)(drift.overall).toBe(0);
    });
    (0, globals_1.it)('handles missing drift fields with defaults', () => {
        const driftInput = {};
        const drift = (0, DriftImpactCalculator_1.calculateDriftImpact)(driftInput);
        (0, globals_1.expect)(drift.semanticDrift).toBe(0);
        (0, globals_1.expect)(drift.temporalDrift).toBe(0);
        (0, globals_1.expect)(drift.narrativeDrift).toBe(0);
        (0, globals_1.expect)(drift.causalDrift).toBe(0);
        (0, globals_1.expect)(drift.compositeDrift).toBe(0);
        (0, globals_1.expect)(drift.overall).toBe(0);
    });
    (0, globals_1.it)('composite drift gets fixed 0.2 stabilizer weight', () => {
        const driftInput = {
            semanticDrift: 0,
            temporalDrift: 0,
            narrativeDrift: 0,
            causalDrift: 0,
            compositeDrift: 1,
        };
        const drift = (0, DriftImpactCalculator_1.calculateDriftImpact)(driftInput);
        (0, globals_1.expect)(drift.overall).toBeCloseTo(1 * 0.2, 5);
    });
});
//# sourceMappingURL=DriftImpactCalculator.test.js.map