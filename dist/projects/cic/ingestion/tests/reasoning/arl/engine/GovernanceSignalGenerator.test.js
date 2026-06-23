"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GovernanceSignalGenerator_1 = require("../../../../src/reasoning/arl/engine/GovernanceSignalGenerator");
const ThresholdModel_1 = require("../../../../src/reasoning/arl/engine/ThresholdModel");
const GovernanceSignal_1 = require("../../../../src/reasoning/arl/contracts/GovernanceSignal");
(0, vitest_1.describe)('GovernanceSignalGenerator — Phase 7.13 BOB Integration', () => {
    let generator;
    let thresholdModel;
    (0, vitest_1.beforeEach)(() => {
        generator = new GovernanceSignalGenerator_1.GovernanceSignalGenerator();
        thresholdModel = new ThresholdModel_1.ThresholdModel();
    });
    (0, vitest_1.describe)('ACCEPT decisions', () => {
        (0, vitest_1.it)('should generate low-risk signal for accepted expansion', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.82,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const signal = generator.generate(thresholdResult, 'exp-001');
            (0, vitest_1.expect)(signal.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('low');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(false);
            (0, vitest_1.expect)(signal.escalationPath).toBeUndefined();
            (0, vitest_1.expect)(signal.reasons).toContain('All 4 threshold checks passed');
        });
    });
    (0, vitest_1.describe)('QUARANTINE decisions — Single failures', () => {
        (0, vitest_1.it)('should route drift failures to memory integrity escalation', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: 0.35, // Above max
                contradictionSeverity: 0.10,
            });
            const signal = generator.generate(thresholdResult, 'exp-002');
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('medium');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
            (0, vitest_1.expect)(signal.escalationPath).toBe(GovernanceSignal_1.ESCALATION_PATHS.MEMORY_INTEGRITY.name);
            (0, vitest_1.expect)(signal.reasons).toContain('Expansion causes unacceptable semantic drift');
        });
        (0, vitest_1.it)('should route contradiction failures to narrative escalation', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.25, // Above max
            });
            const signal = generator.generate(thresholdResult, 'exp-003');
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('medium');
            (0, vitest_1.expect)(signal.escalationPath).toBe(GovernanceSignal_1.ESCALATION_PATHS.NARRATIVE_COHERENCE.name);
            (0, vitest_1.expect)(signal.reasons).toContain('Expansion introduces critical narrative contradictions');
        });
        (0, vitest_1.it)('should route confidence failures to operator review', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.65, // Below min
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const signal = generator.generate(thresholdResult, 'exp-004');
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.escalationPath).toBe(GovernanceSignal_1.ESCALATION_PATHS.OPERATOR_REVIEW.name);
        });
    });
    (0, vitest_1.describe)('REJECT decisions — Multiple failures', () => {
        (0, vitest_1.it)('should mark high narrative risk for multiple failures', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.65,
                confidence: 0.60,
                driftMagnitude: 0.40,
                contradictionSeverity: 0.30,
            });
            const signal = generator.generate(thresholdResult, 'exp-005');
            (0, vitest_1.expect)(signal.decision).toBe('REJECT');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('high');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
        });
        (0, vitest_1.it)('should include detailed failure reasons for all subsystems', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.60,
                confidence: 0.60,
                driftMagnitude: 0.50,
                contradictionSeverity: 0.50,
            });
            const signal = generator.generate(thresholdResult, 'exp-006');
            (0, vitest_1.expect)(signal.reasons.length).toBeGreaterThanOrEqual(4);
            (0, vitest_1.expect)(signal.reasons.some((r) => r.includes('Composite Reasoning'))).toBe(true);
            (0, vitest_1.expect)(signal.reasons.some((r) => r.includes('Confidence Level'))).toBe(true);
            (0, vitest_1.expect)(signal.reasons.some((r) => r.includes('Drift Magnitude'))).toBe(true);
            (0, vitest_1.expect)(signal.reasons.some((r) => r.includes('Contradiction'))).toBe(true);
        });
    });
    (0, vitest_1.describe)('Drift Vector Integration', () => {
        (0, vitest_1.it)('should include drift vector in governance signal', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.85,
                confidence: 0.82,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const driftVector = {
                semantic: 0.12,
                temporal: 0.08,
                narrative: 0.10,
                causal: 0.15,
                magnitude: 0.15,
            };
            const signal = generator.generate(thresholdResult, 'exp-007', driftVector);
            (0, vitest_1.expect)(signal.driftVector).toEqual(driftVector);
        });
    });
    (0, vitest_1.describe)('Audit Trail', () => {
        (0, vitest_1.it)('should include timestamp and phase info for auditing', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.80,
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const signal = generator.generate(thresholdResult, 'exp-008');
            (0, vitest_1.expect)(signal.auditEntry).toBeDefined();
            (0, vitest_1.expect)(signal.auditEntry.phaseId).toBe('7.12');
            (0, vitest_1.expect)(signal.auditEntry.timestamp).toBeInstanceOf(Date);
            (0, vitest_1.expect)(signal.auditEntry.decision).toBe('ACCEPT');
            (0, vitest_1.expect)(signal.auditEntry.reasonCount).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should track reason count for audit purposes', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.60,
                confidence: 0.60,
                driftMagnitude: 0.50,
                contradictionSeverity: 0.50,
            });
            const signal = generator.generate(thresholdResult, 'exp-009');
            (0, vitest_1.expect)(signal.auditEntry.reasonCount).toBe(signal.reasons.length);
        });
    });
    (0, vitest_1.describe)('Operator Override Policy', () => {
        (0, vitest_1.it)('should allow overrides for QUARANTINE decisions', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.80,
                confidence: 0.65, // Below min
                driftMagnitude: 0.15,
                contradictionSeverity: 0.10,
            });
            const signal = generator.generate(thresholdResult, 'exp-010');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE'); // QUARANTINE maps to ESCALATE
        });
        (0, vitest_1.it)('should disallow overrides for ACCEPT decisions', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.90,
                confidence: 0.90,
                driftMagnitude: 0.10,
                contradictionSeverity: 0.05,
            });
            const signal = generator.generate(thresholdResult, 'exp-011');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(false);
        });
        (0, vitest_1.it)('should allow overrides for REJECT decisions', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.40,
                confidence: 0.40,
                driftMagnitude: 0.60,
                contradictionSeverity: 0.60,
            });
            const signal = generator.generate(thresholdResult, 'exp-012');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('Real-world Scenarios', () => {
        (0, vitest_1.it)('should handle a low-quality expansion with multiple issues', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.45,
                confidence: 0.35,
                driftMagnitude: 0.55,
                contradictionSeverity: 0.55,
            });
            const signal = generator.generate(thresholdResult, 'exp-013');
            (0, vitest_1.expect)(signal.decision).toBe('REJECT');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('high');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
            (0, vitest_1.expect)(signal.reasons.length).toBeGreaterThan(4);
        });
        (0, vitest_1.it)('should handle a marginal expansion needing operator judgment', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.76, // Just above 0.75 threshold
                confidence: 0.68, // Just below 0.70 threshold
                driftMagnitude: 0.25,
                contradictionSeverity: 0.15,
            });
            const signal = generator.generate(thresholdResult, 'exp-014');
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('medium');
            (0, vitest_1.expect)(signal.operatorOverrideAllowed).toBe(true);
        });
        (0, vitest_1.it)('should trace a high-confidence expansion with detected drift', () => {
            const thresholdResult = thresholdModel.evaluate({
                compositeReasoning: 0.88,
                confidence: 0.85,
                driftMagnitude: 0.32, // Unexpected spike
                contradictionSeverity: 0.10,
            });
            const driftVector = {
                semantic: 0.25,
                temporal: 0.15,
                narrative: 0.20,
                causal: 0.32,
                magnitude: 0.32,
            };
            const signal = generator.generate(thresholdResult, 'exp-015', driftVector);
            (0, vitest_1.expect)(signal.decision).toBe('ESCALATE');
            (0, vitest_1.expect)(signal.narrativeRiskLevel).toBe('medium');
            (0, vitest_1.expect)(signal.escalationPath).toBe(GovernanceSignal_1.ESCALATION_PATHS.MEMORY_INTEGRITY.name);
            (0, vitest_1.expect)(signal.driftVector?.magnitude).toBe(0.32);
        });
    });
});
//# sourceMappingURL=GovernanceSignalGenerator.test.js.map