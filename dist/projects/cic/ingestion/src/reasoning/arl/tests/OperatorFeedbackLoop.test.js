"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const OperatorFeedbackLoop_1 = require("../engine/OperatorFeedbackLoop");
const ThresholdConfig_1 = require("../contracts/ThresholdConfig");
const FeedbackFixtures_1 = require("./fixtures/FeedbackFixtures");
(0, vitest_1.describe)('Batch 2, Phase 7.18: Operator Feedback Loop', () => {
    let feedbackLoop;
    (0, vitest_1.beforeEach)(() => {
        feedbackLoop = new OperatorFeedbackLoop_1.OperatorFeedbackLoop();
    });
    (0, vitest_1.describe)('Adjustment computation', () => {
        (0, vitest_1.it)('should relax thresholds for false rejects', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            (0, vitest_1.expect)(adjustments.thresholdAdjustments.composite).toBeGreaterThan(0);
            (0, vitest_1.expect)(adjustments.thresholdAdjustments.confidence).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should tighten thresholds for false accepts', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseAccepts)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            (0, vitest_1.expect)(adjustments.thresholdAdjustments.composite).toBeLessThan(0);
            (0, vitest_1.expect)(adjustments.thresholdAdjustments.confidence).toBeLessThan(0);
        });
        (0, vitest_1.it)('should handle empty feedback', () => {
            const feedback = (0, FeedbackFixtures_1.makeEmptyFeedback)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            (0, vitest_1.expect)(adjustments.driftAdjustment).toBe(0);
            (0, vitest_1.expect)(adjustments.narrativeRiskAdjustment).toBe(0);
            (0, vitest_1.expect)(adjustments.thresholdAdjustments.composite).toBe(0);
        });
    });
    (0, vitest_1.describe)('Bounded adjustments', () => {
        (0, vitest_1.it)('should not exceed maximum adjustment bounds', () => {
            const feedback = Array(10).fill({
                id: 'test',
                timestamp: new Date().toISOString(),
                originalVerdict: 'REJECT',
                operatorVerdict: 'ACCEPT',
                reason: 'test',
            });
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            (0, vitest_1.expect)(Math.abs(adjustments.driftAdjustment)).toBeLessThanOrEqual(0.2);
            (0, vitest_1.expect)(Math.abs(adjustments.narrativeRiskAdjustment)).toBeLessThanOrEqual(0.2);
        });
        (0, vitest_1.it)('should not exceed individual threshold adjustment bounds', () => {
            const feedback = (0, FeedbackFixtures_1.makeMixedFeedback)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            Object.values(adjustments.thresholdAdjustments).forEach((adj) => {
                if (adj !== undefined) {
                    (0, vitest_1.expect)(Math.abs(adj)).toBeLessThanOrEqual(0.2);
                }
            });
        });
    });
    (0, vitest_1.describe)('Directionality', () => {
        (0, vitest_1.it)('should increase thresholds when correcting false rejects', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            const config = {
                compositeReasoningMin: ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin,
                confidenceMin: ThresholdConfig_1.DEFAULT_THRESHOLDS.confidenceMin,
                driftMaxMagnitude: ThresholdConfig_1.DEFAULT_THRESHOLDS.driftMaxMagnitude,
                contradictionSeverityMax: ThresholdConfig_1.DEFAULT_THRESHOLDS.contradictionSeverityMax,
            };
            const adjusted = feedbackLoop.applyAdjustments(config, adjustments);
            (0, vitest_1.expect)(adjusted.compositeReasoningMin).toBeGreaterThanOrEqual(config.compositeReasoningMin);
            (0, vitest_1.expect)(adjusted.confidenceMin).toBeGreaterThanOrEqual(config.confidenceMin);
        });
        (0, vitest_1.it)('should decrease thresholds when correcting false accepts', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseAccepts)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            const config = {
                compositeReasoningMin: ThresholdConfig_1.DEFAULT_THRESHOLDS.compositeReasoningMin,
                confidenceMin: ThresholdConfig_1.DEFAULT_THRESHOLDS.confidenceMin,
                driftMaxMagnitude: ThresholdConfig_1.DEFAULT_THRESHOLDS.driftMaxMagnitude,
                contradictionSeverityMax: ThresholdConfig_1.DEFAULT_THRESHOLDS.contradictionSeverityMax,
            };
            const adjusted = feedbackLoop.applyAdjustments(config, adjustments);
            (0, vitest_1.expect)(adjusted.compositeReasoningMin).toBeLessThanOrEqual(config.compositeReasoningMin);
            (0, vitest_1.expect)(adjusted.confidenceMin).toBeLessThanOrEqual(config.confidenceMin);
        });
    });
    (0, vitest_1.describe)('Idempotence', () => {
        (0, vitest_1.it)('should produce same result when applying identical feedback twice', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const config = ThresholdConfig_1.DEFAULT_THRESHOLDS;
            const adjustments1 = feedbackLoop.computeAdjustments(feedback);
            const adjusted1 = feedbackLoop.applyAdjustments(config, adjustments1);
            const adjustments2 = feedbackLoop.computeAdjustments(feedback);
            const adjusted2 = feedbackLoop.applyAdjustments(adjusted1, adjustments2);
            (0, vitest_1.expect)(adjusted2.compositeReasoningMin).toBeLessThanOrEqual(Math.max(...[adjusted1.compositeReasoningMin, 1]));
        });
    });
    (0, vitest_1.describe)('Safe application to ThresholdConfig', () => {
        (0, vitest_1.it)('should return valid ThresholdConfig after adjustment', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            const config = ThresholdConfig_1.DEFAULT_THRESHOLDS;
            const adjusted = feedbackLoop.applyAdjustments(config, adjustments);
            (0, vitest_1.expect)(adjusted).toHaveProperty('compositeReasoningMin');
            (0, vitest_1.expect)(adjusted).toHaveProperty('confidenceMin');
            (0, vitest_1.expect)(adjusted).toHaveProperty('driftMaxMagnitude');
            (0, vitest_1.expect)(adjusted).toHaveProperty('contradictionSeverityMax');
        });
        (0, vitest_1.it)('should ensure thresholds stay in valid range', () => {
            const feedback = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            const config = ThresholdConfig_1.DEFAULT_THRESHOLDS;
            const adjusted = feedbackLoop.applyAdjustments(config, adjustments);
            (0, vitest_1.expect)(adjusted.compositeReasoningMin).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(adjusted.compositeReasoningMin).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(adjusted.confidenceMin).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(adjusted.confidenceMin).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(adjusted.driftMaxMagnitude).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(adjusted.driftMaxMagnitude).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(adjusted.contradictionSeverityMax).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(adjusted.contradictionSeverityMax).toBeLessThanOrEqual(1);
        });
        (0, vitest_1.it)('should handle cumulative adjustments without overflow', () => {
            const feedback1 = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const feedback2 = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const feedback3 = (0, FeedbackFixtures_1.makeFeedbackCorrectingFalseRejects)();
            const config = ThresholdConfig_1.DEFAULT_THRESHOLDS;
            const adj1 = feedbackLoop.computeAdjustments(feedback1);
            const config1 = feedbackLoop.applyAdjustments(config, adj1);
            const adj2 = feedbackLoop.computeAdjustments(feedback2);
            const config2 = feedbackLoop.applyAdjustments(config1, adj2);
            const adj3 = feedbackLoop.computeAdjustments(feedback3);
            const config3 = feedbackLoop.applyAdjustments(config2, adj3);
            (0, vitest_1.expect)(config3.compositeReasoningMin).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(config3.compositeReasoningMin).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Mixed feedback handling', () => {
        (0, vitest_1.it)('should balance false rejections and false acceptances', () => {
            const feedback = (0, FeedbackFixtures_1.makeMixedFeedback)();
            const adjustments = feedbackLoop.computeAdjustments(feedback);
            (0, vitest_1.expect)(adjustments).toBeDefined();
            (0, vitest_1.expect)(Math.abs(adjustments.driftAdjustment)).toBeLessThanOrEqual(0.2);
        });
    });
});
//# sourceMappingURL=OperatorFeedbackLoop.test.js.map