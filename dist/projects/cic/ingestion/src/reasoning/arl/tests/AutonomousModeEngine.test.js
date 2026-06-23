"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const AutonomousModeEngine_1 = require("../engine/AutonomousModeEngine");
(0, vitest_1.describe)('Batch 4, Phase 7.25: Autonomous Mode Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new AutonomousModeEngine_1.AutonomousModeEngine();
    });
    (0, vitest_1.it)('should initialize autonomous mode with self-governing thresholds', () => {
        const state = engine.initializeAutonomousMode();
        (0, vitest_1.expect)(state.isAutonomous).toBe(true);
        (0, vitest_1.expect)(state.thresholds).toHaveLength(4);
        (0, vitest_1.expect)(state.autonomyScore).toBeGreaterThan(0.8);
    });
    (0, vitest_1.it)('should make autonomous decisions', () => {
        const state = engine.initializeAutonomousMode();
        const { decision, updatedState } = engine.makeAutonomousDecision(0.85, 0.9, state);
        (0, vitest_1.expect)(decision.verdict).toBe('ACCEPT');
        (0, vitest_1.expect)(decision.confidence).toBe(0.9);
        (0, vitest_1.expect)(updatedState.recentDecisions).toHaveLength(1);
    });
    (0, vitest_1.it)('should flag decisions requiring operator review', () => {
        const state = engine.initializeAutonomousMode();
        const { decision: lowConfidence } = engine.makeAutonomousDecision(0.5, 0.6, state);
        (0, vitest_1.expect)(lowConfidence.requiresOperatorReview).toBe(true);
        const { decision: highConfidence } = engine.makeAutonomousDecision(0.75, 0.95, state);
        (0, vitest_1.expect)(highConfidence.requiresOperatorReview).toBe(false);
    });
    (0, vitest_1.it)('should autonomously reject expansions', () => {
        const state = engine.initializeAutonomousMode();
        const updated = engine.autonomouslyReject('High drift detected', 0.7, state);
        (0, vitest_1.expect)(updated.rejections).toHaveLength(1);
        (0, vitest_1.expect)(updated.autonomyScore).toBeLessThan(state.autonomyScore);
    });
    (0, vitest_1.it)('should autonomously escalate complex cases', () => {
        const state = engine.initializeAutonomousMode();
        const updated = engine.autonomouslyEscalate('operator_arbitration', 0.8, state);
        (0, vitest_1.expect)(updated.escalations).toHaveLength(1);
    });
    (0, vitest_1.it)('should autonomously stabilize system', () => {
        const state = engine.initializeAutonomousMode();
        const updated = engine.autonomouslyStabilize('Adjust memory consistency thresholds', state);
        (0, vitest_1.expect)(updated.stabilizations).toHaveLength(1);
        (0, vitest_1.expect)(updated.autonomyScore).toBeGreaterThan(state.autonomyScore);
    });
    (0, vitest_1.it)('should maintain reasonable autonomy score bounds', () => {
        let state = engine.initializeAutonomousMode();
        for (let i = 0; i < 20; i++) {
            state = engine.autonomouslyReject(`Rejection ${i}`, 0.5, state);
        }
        (0, vitest_1.expect)(state.autonomyScore).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(state.autonomyScore).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('should adapt thresholds for autonomous operation', () => {
        const state = engine.initializeAutonomousMode();
        state.thresholds.forEach((threshold) => {
            (0, vitest_1.expect)(threshold.adaptiveRange.min).toBeLessThan(threshold.adaptiveRange.max);
            (0, vitest_1.expect)(threshold.currentValue).toBeGreaterThanOrEqual(threshold.adaptiveRange.min);
            (0, vitest_1.expect)(threshold.currentValue).toBeLessThanOrEqual(threshold.adaptiveRange.max);
        });
    });
});
//# sourceMappingURL=AutonomousModeEngine.test.js.map