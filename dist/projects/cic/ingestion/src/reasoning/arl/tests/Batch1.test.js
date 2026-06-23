"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ThresholdModel_1 = require("../engine/ThresholdModel");
const GovernanceHookExecutor_1 = require("../engine/GovernanceHookExecutor");
const SelfDiagnosticsEngine_1 = require("../engine/SelfDiagnosticsEngine");
const ThresholdConfig_1 = require("../contracts/ThresholdConfig");
(0, vitest_1.describe)('Batch 1: Phases 7.12–7.14', () => {
    (0, vitest_1.describe)('Phase 7.12: Threshold Model', () => {
        let thresholdModel;
        (0, vitest_1.beforeEach)(() => {
            thresholdModel = new ThresholdModel_1.ThresholdModel();
        });
        (0, vitest_1.it)('should ACCEPT when all thresholds pass', () => {
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.1,
            });
            (0, vitest_1.expect)(result.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(result.failed.length).toBe(0);
            (0, vitest_1.expect)(result.passed.length).toBe(4);
        });
        (0, vitest_1.it)('should QUARANTINE when single threshold fails', () => {
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.6,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.1,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.failed.length).toBe(1);
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.COMPOSITE_TOO_LOW);
        });
        (0, vitest_1.it)('should REJECT when multiple thresholds fail', () => {
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.6,
                confidence: 0.6,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.1,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.failed.length).toBe(2);
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES);
        });
        (0, vitest_1.it)('should detect drift magnitude exceeding threshold', () => {
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.5,
                contradictionSeverity: 0.1,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH);
        });
        (0, vitest_1.it)('should detect contradiction severity exceeding threshold', () => {
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.5,
            });
            (0, vitest_1.expect)(result.decision).toBe('QUARANTINE');
            (0, vitest_1.expect)(result.rejectCode).toBe(ThresholdConfig_1.REJECT_CODES.CONTRADICTION_TOO_SEVERE);
        });
        (0, vitest_1.it)('should use custom thresholds', () => {
            const customModel = new ThresholdModel_1.ThresholdModel({
                compositeReasoningMin: 0.9,
            });
            const result = customModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contraditionSeverity: 0.1,
            });
            (0, vitest_1.expect)(result.decision).toBe('REJECT');
            (0, vitest_1.expect)(result.failed.length).toBe(2); // compositeReasoning and confidence both below 0.9
        });
    });
    (0, vitest_1.describe)('Phase 7.13: Governance Hooks', () => {
        let executor;
        (0, vitest_1.beforeEach)(() => {
            executor = new GovernanceHookExecutor_1.GovernanceHookExecutor();
        });
        (0, vitest_1.it)('should generate ACCEPT signal for accepted threshold', () => {
            const thresholdModel = new ThresholdModel_1.ThresholdModel();
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.1,
            });
            const signal = executor.executeThreshold('7.12', result, { semantic: 0.1, temporal: 0.1, narrative: 0.1, causal: 0.05 }, 'low');
            (0, vitest_1.expect)(signal.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
        });
        (0, vitest_1.it)('should generate REJECT signal for rejected threshold', () => {
            const thresholdModel = new ThresholdModel_1.ThresholdModel();
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.6,
                confidence: 0.6,
                driftMagnitude: 0.5,
                contradictionSeverity: 0.1,
            });
            const signal = executor.executeThreshold('7.12', result, { semantic: 0.5, temporal: 0.3, narrative: 0.2, causal: 0.1 }, 'high');
            (0, vitest_1.expect)(signal.decision).toBe('REJECT');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(false);
        });
        (0, vitest_1.it)('should escalate quarantine when drift is high', () => {
            const thresholdModel = new ThresholdModel_1.ThresholdModel();
            const result = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.5,
                contradictionSeverity: 0.1,
            });
            const signal = executor.executeThreshold('7.12', result, { semantic: 0.3, temporal: 0.3, narrative: 0.3, causal: 0.1 }, 'low');
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.escalationPath).toBe('memory_integrity_check');
        });
        (0, vitest_1.it)('should maintain audit log', () => {
            const thresholdModel = new ThresholdModel_1.ThresholdModel();
            const result1 = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.8,
                driftMagnitude: 0.2,
                contradictionSeverity: 0.1,
            });
            executor.executeThreshold('7.12', result1, { semantic: 0.1, temporal: 0.1, narrative: 0.1, causal: 0.05 }, 'low');
            executor.executeThreshold('7.13', result1, { semantic: 0.1, temporal: 0.1, narrative: 0.1, causal: 0.05 }, 'low');
            const log = executor.getAuditLog();
            (0, vitest_1.expect)(log.length).toBe(2);
            (0, vitest_1.expect)(log[0].phaseId).toBe('7.12');
            (0, vitest_1.expect)(log[1].phaseId).toBe('7.13');
        });
    });
    (0, vitest_1.describe)('Phase 7.14: Self-Diagnostics', () => {
        let diagnostics;
        (0, vitest_1.beforeEach)(() => {
            diagnostics = new SelfDiagnosticsEngine_1.SelfDiagnosticsEngine();
        });
        (0, vitest_1.it)('should report healthy system', () => {
            const state = {
                compositeReasoning: { score: 0.85, variance: 0.05 },
                confidenceModel: { score: 0.8, variance: 0.04 },
                driftCalculator: { score: 0.75, variance: 0.06 },
                verdictSynthesizer: { score: 0.88, variance: 0.03 },
            };
            const result = diagnostics.runDiagnostics(state);
            (0, vitest_1.expect)(result.overallStatus).toBe('healthy');
            (0, vitest_1.expect)(result.reasoningIntegrityScore).toBeGreaterThan(0.7);
        });
        (0, vitest_1.it)('should detect degraded system', () => {
            const state = {
                compositeReasoning: { score: 0.3, variance: 0.3 },
                confidenceModel: { score: 0.2, variance: 0.35 },
                driftCalculator: { score: 0.15, variance: 0.4 },
                verdictSynthesizer: { score: 0.25, variance: 0.38 },
            };
            const result = diagnostics.runDiagnostics(state);
            (0, vitest_1.expect)(result.overallStatus).not.toBe('healthy');
            (0, vitest_1.expect)(result.reasoningIntegrityScore).toBeLessThan(0.8);
        });
        (0, vitest_1.it)('should calculate drift-of-drift after multiple runs', () => {
            const state1 = {
                compositeReasoning: { score: 0.85, variance: 0.05 },
                confidenceModel: { score: 0.8, variance: 0.04 },
                driftCalculator: { score: 0.75, variance: 0.06 },
                verdictSynthesizer: { score: 0.88, variance: 0.03 },
            };
            const state2 = {
                compositeReasoning: { score: 0.84, variance: 0.07 },
                confidenceModel: { score: 0.8, variance: 0.04 },
                driftCalculator: { score: 0.76, variance: 0.08 },
                verdictSynthesizer: { score: 0.87, variance: 0.03 },
            };
            diagnostics.runDiagnostics(state1);
            const result = diagnostics.runDiagnostics(state2);
            (0, vitest_1.expect)(result.driftOfDriftScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.driftOfDriftScore).toBeLessThan(1);
        });
        (0, vitest_1.it)('should validate weighting sanity', () => {
            const state = {
                compositeReasoning: { score: 0.95, variance: 0.02 },
                confidenceModel: { score: 0.05, variance: 0.01 },
                driftCalculator: { score: 0.02, variance: 0.01 },
                verdictSynthesizer: { score: 0.01, variance: 0.005 },
            };
            const result = diagnostics.runDiagnostics(state);
            (0, vitest_1.expect)(result.weightingSanityScore).toBeLessThan(0.8);
        });
        (0, vitest_1.it)('should detect internal contradictions', () => {
            const state = {
                compositeReasoning: { score: 0.3, variance: 0.05 },
                confidenceModel: { score: 0.95, variance: 0.02 },
                driftCalculator: { score: 0.1, variance: 0.5 },
                verdictSynthesizer: { score: 0.85, variance: 0.03 },
            };
            const result = diagnostics.runDiagnostics(state);
            const checks = result.checks.filter((c) => c.status === 'failed');
            (0, vitest_1.expect)(checks.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should generate recommendations', () => {
            const state = {
                compositeReasoning: { score: 0.4, variance: 0.2 },
                confidenceModel: { score: 0.5, variance: 0.2 },
                driftCalculator: { score: 0.4, variance: 0.25 },
                verdictSynthesizer: { score: 0.45, variance: 0.2 },
            };
            const result = diagnostics.runDiagnostics(state);
            (0, vitest_1.expect)(result.recommendations.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=Batch1.test.js.map