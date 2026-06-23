"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ThresholdModel_1 = require("../../../../src/reasoning/arl/engine/ThresholdModel");
const ThresholdConfig_1 = require("../../../../src/reasoning/arl/contracts/ThresholdConfig");
(0, vitest_1.describe)('ThresholdModel — Phase 7.12 Deterministic Decision Engine', () => {
    let model;
    (0, vitest_1.beforeEach)(() => {
        model = new ThresholdModel_1.ThresholdModel();
    });
    (0, vitest_1.describe)('Happy Path — All thresholds pass', () => {
        (0, vitest_1.it)('should ACCEPT when all metrics pass', () => {
            const result = model.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.82,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(result.rejectCode).toBeUndefined();
            (0, vitest_1.expect)(result.passed.length).toBe(4);
            (0, vitest_1.expect)(result.failed.length).toBe(0);
        });
        (0, vitest_1.it)('should ACCEPT at exact threshold boundaries', () => {
            const result = model.evaluate({
                compositeReasoning: ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin,
                confidence: ThresholdConfig_1.DEFAULT_THRESHOLDS.confidenceMin,
                driftMagnitude: ThresholdConfig_1.DEFAULT_THRESHOLDS.driftMaxMagnitude,
                contradictionSeverity: ThresholdConfig_1.DEFAULT_THRESHOLDS.contradictionSeverityMax,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(result.failed.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('Single Failure — QUARANTINE', () => {
        (0, vitest_1.it)('should QUARANTINE when composite reasoning is too low', () => {
            const result = model.evaluate({
                compositeReasoning: 0.70, // Below 0.75 minimum
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.COMPOSITE_TOO_LOW);
            (0, vitest_1.expect)(result.failed.length).toBe(1);
            (0, vitest_1.expect)(result.failed[0].name).toBe('Composite Reasoning');
        });
        (0, vitest_1.it)('should QUARANTINE when confidence is too low', () => {
            const result = model.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.65, // Below 0.70 minimum
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.CONFIDENCE_TOO_LOW);
            (0, vitest_1.expect)(result.failed[0].name).toBe('Confidence Level');
        });
        (0, vitest_1.it)('should QUARANTINE when drift magnitude exceeds threshold', () => {
            const result = model.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: 0.35, // Above 0.30 maximum
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH);
            (0, vitest_1.expect)(result.failed[0].name).toBe('Drift Magnitude');
        });
        (0, vitest_1.it)('should QUARANTINE when contradiction severity exceeds threshold', () => {
            const result = model.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.25, // Above 0.20 maximum
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.CONTRADICTION_TOO_SEVERE);
            (0, vitest_1.expect)(result.failed[0].name).toBe('Contradiction Severity');
        });
    });
    (0, vitest_1.describe)('Multiple Failures — REJECT', () => {
        (0, vitest_1.it)('should REJECT when two thresholds fail', () => {
            const result = model.evaluate({
                compositeReasoning: 0.65, // Below min
                confidence: 0.65, // Below min
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES);
            (0, vitest_1.expect)(result.failed.length).toBe(2);
        });
        (0, vitest_1.it)('should REJECT when three thresholds fail', () => {
            const result = model.evaluate({
                compositeReasoning: 0.60,
                confidence: 0.60,
                driftMagnitude: 0.50,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES);
            (0, vitest_1.expect)(result.failed.length).toBe(3);
        });
        (0, vitest_1.it)('should REJECT when all four thresholds fail', () => {
            const result = model.evaluate({
                compositeReasoning: 0.50,
                confidence: 0.50,
                driftMagnitude: 0.50,
                contradictionSeverity: 0.50,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES);
            (0, vitest_1.expect)(result.failed.length).toBe(4);
            (0, vitest_1.expect)(result.passed.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('Boundary Conditions', () => {
        (0, vitest_1.it)('should fail if composite reasoning is 0.001 below threshold', () => {
            const result = model.evaluate({
                compositeReasoning: ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin - 0.001,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.failed.length).toBe(1);
        });
        (0, vitest_1.it)('should pass if composite reasoning is 0.001 above threshold', () => {
            const result = model.evaluate({
                compositeReasoning: ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin + 0.001,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(result.failed.length).toBe(0);
        });
        (0, vitest_1.it)('should fail if drift is 0.001 above threshold', () => {
            const result = model.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: ThresholdConfig_1.DEFAULT_THRESHOLDS.driftMaxMagnitude + 0.001,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.failed[0].name).toBe('Drift Magnitude');
        });
    });
    (0, vitest_1.describe)('Custom Thresholds', () => {
        (0, vitest_1.it)('should accept custom threshold configuration', () => {
            const customModel = new ThresholdModel_1.ThresholdModel({
                compositeReasoningMin: 0.9,
                confidenceMin: 0.95,
            });
            const result = customModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.90,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.failed.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('Detailed Check Information', () => {
        (0, vitest_1.it)('should provide actual vs threshold values for passed checks', () => {
            const result = model.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.82,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const compositeCheck = result.passed.find((c) => c.name === 'Composite Reasoning');
            (0, vitest_1.expect)(compositeCheck?.actual).toBe(0.85);
            (0, vitest_1.expect)(compositeCheck?.threshold).toBe(ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin);
            (0, vitest_1.expect)(compositeCheck?.pass).toBe(true);
        });
        (0, vitest_1.it)('should provide actual vs threshold values for failed checks', () => {
            const result = model.evaluate({
                compositeReasoning: 0.65,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const compositeCheck = result.failed.find((c) => c.name === 'Composite Reasoning');
            (0, vitest_1.expect)(compositeCheck?.actual).toBe(0.65);
            (0, vitest_1.expect)(compositeCheck?.threshold).toBe(ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin);
            (0, vitest_1.expect)(compositeCheck?.pass).toBe(false);
        });
    });
    (0, vitest_1.describe)('Real-world Scenarios', () => {
        (0, vitest_1.it)('should handle a high-quality expansion candidate', () => {
            const result = model.evaluate({
                compositeReasoning: 0.92,
                confidence: 0.88,
                driftMagnitude: 0.08,
                contradictionSeverity: 0.05,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
        });
        (0, vitest_1.it)('should handle a marginal expansion candidate requiring review', () => {
            const result = model.evaluate({
                compositeReasoning: 0.76,
                confidence: 0.71,
                driftMagnitude: 0.25,
                contradictionSeverity: 0.18,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
        });
        (0, vitest_1.it)('should quarantine when drift rises during expansion', () => {
            const result = model.evaluate({
                compositeReasoning: 0.82,
                confidence: 0.78,
                driftMagnitude: 0.35, // Unexpected drift spike
                contradictionSeverity: 0.10,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH);
        });
        (0, vitest_1.it)('should reject when expansion introduces contradictions', () => {
            const result = model.evaluate({
                compositeReasoning: 0.45,
                confidence: 0.55,
                driftMagnitude: 0.45,
                contradictionSeverity: 0.60, // Critical contradiction detected
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.failed.length).toBe(4);
        });
    });
});
//# sourceMappingURL=ThresholdModel.test.js.map