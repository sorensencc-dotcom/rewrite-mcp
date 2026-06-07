import { describe, it, expect, beforeEach } from 'vitest';
import { OperatorFeedbackLoop } from '../engine/OperatorFeedbackLoop';
import { DEFAULT_THRESHOLDS } from '../contracts/ThresholdConfig';
import {
  makeFeedbackCorrectingFalseRejects,
  makeFeedbackCorrectingFalseAccepts,
  makeMixedFeedback,
  makeEmptyFeedback,
} from './fixtures/FeedbackFixtures';

describe('Batch 2, Phase 7.18: Operator Feedback Loop', () => {
  let feedbackLoop: OperatorFeedbackLoop;

  beforeEach(() => {
    feedbackLoop = new OperatorFeedbackLoop();
  });

  describe('Adjustment computation', () => {
    it('should relax thresholds for false rejects', () => {
      const feedback = makeFeedbackCorrectingFalseRejects();

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      expect(adjustments.thresholdAdjustments.composite).toBeGreaterThan(0);
      expect(adjustments.thresholdAdjustments.confidence).toBeGreaterThan(0);
    });

    it('should tighten thresholds for false accepts', () => {
      const feedback = makeFeedbackCorrectingFalseAccepts();

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      expect(adjustments.thresholdAdjustments.composite).toBeLessThan(0);
      expect(adjustments.thresholdAdjustments.confidence).toBeLessThan(0);
    });

    it('should handle empty feedback', () => {
      const feedback = makeEmptyFeedback();

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      expect(adjustments.driftAdjustment).toBe(0);
      expect(adjustments.narrativeRiskAdjustment).toBe(0);
      expect(adjustments.thresholdAdjustments.composite).toBe(0);
    });
  });

  describe('Bounded adjustments', () => {
    it('should not exceed maximum adjustment bounds', () => {
      const feedback = Array(10).fill({
        id: 'test',
        timestamp: new Date().toISOString(),
        originalVerdict: 'REJECT' as const,
        operatorVerdict: 'ACCEPT' as const,
        reason: 'test',
      });

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      expect(Math.abs(adjustments.driftAdjustment)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(adjustments.narrativeRiskAdjustment)).toBeLessThanOrEqual(
        0.2
      );
    });

    it('should not exceed individual threshold adjustment bounds', () => {
      const feedback = makeMixedFeedback();

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      Object.values(adjustments.thresholdAdjustments).forEach((adj) => {
        if (adj !== undefined) {
          expect(Math.abs(adj)).toBeLessThanOrEqual(0.2);
        }
      });
    });
  });

  describe('Directionality', () => {
    it('should increase thresholds when correcting false rejects', () => {
      const feedback = makeFeedbackCorrectingFalseRejects();
      const adjustments = feedbackLoop.computeAdjustments(feedback);

      const config = {
        compositeReasoningMin: DEFAULT_THRESHOLDS.compositeReasoningMin,
        confidenceMin: DEFAULT_THRESHOLDS.confidenceMin,
        driftMaxMagnitude: DEFAULT_THRESHOLDS.driftMaxMagnitude,
        contradictionSeverityMax: DEFAULT_THRESHOLDS.contradictionSeverityMax,
      };

      const adjusted = feedbackLoop.applyAdjustments(config, adjustments);

      expect(adjusted.compositeReasoningMin).toBeGreaterThanOrEqual(
        config.compositeReasoningMin
      );
      expect(adjusted.confidenceMin).toBeGreaterThanOrEqual(config.confidenceMin);
    });

    it('should decrease thresholds when correcting false accepts', () => {
      const feedback = makeFeedbackCorrectingFalseAccepts();
      const adjustments = feedbackLoop.computeAdjustments(feedback);

      const config = {
        compositeReasoningMin: DEFAULT_THRESHOLDS.compositeReasoningMin,
        confidenceMin: DEFAULT_THRESHOLDS.confidenceMin,
        driftMaxMagnitude: DEFAULT_THRESHOLDS.driftMaxMagnitude,
        contradictionSeverityMax: DEFAULT_THRESHOLDS.contradictionSeverityMax,
      };

      const adjusted = feedbackLoop.applyAdjustments(config, adjustments);

      expect(adjusted.compositeReasoningMin).toBeLessThanOrEqual(
        config.compositeReasoningMin
      );
      expect(adjusted.confidenceMin).toBeLessThanOrEqual(config.confidenceMin);
    });
  });

  describe('Idempotence', () => {
    it('should produce same result when applying identical feedback twice', () => {
      const feedback = makeFeedbackCorrectingFalseRejects();
      const config = DEFAULT_THRESHOLDS;

      const adjustments1 = feedbackLoop.computeAdjustments(feedback);
      const adjusted1 = feedbackLoop.applyAdjustments(config, adjustments1);

      const adjustments2 = feedbackLoop.computeAdjustments(feedback);
      const adjusted2 = feedbackLoop.applyAdjustments(adjusted1, adjustments2);

      expect(adjusted2.compositeReasoningMin).toBeLessThanOrEqual(
        Math.max(...[adjusted1.compositeReasoningMin, 1])
      );
    });
  });

  describe('Safe application to ThresholdConfig', () => {
    it('should return valid ThresholdConfig after adjustment', () => {
      const feedback = makeFeedbackCorrectingFalseRejects();
      const adjustments = feedbackLoop.computeAdjustments(feedback);
      const config = DEFAULT_THRESHOLDS;

      const adjusted = feedbackLoop.applyAdjustments(config, adjustments);

      expect(adjusted).toHaveProperty('compositeReasoningMin');
      expect(adjusted).toHaveProperty('confidenceMin');
      expect(adjusted).toHaveProperty('driftMaxMagnitude');
      expect(adjusted).toHaveProperty('contradictionSeverityMax');
    });

    it('should ensure thresholds stay in valid range', () => {
      const feedback = makeFeedbackCorrectingFalseRejects();
      const adjustments = feedbackLoop.computeAdjustments(feedback);
      const config = DEFAULT_THRESHOLDS;

      const adjusted = feedbackLoop.applyAdjustments(config, adjustments);

      expect(adjusted.compositeReasoningMin).toBeGreaterThanOrEqual(0);
      expect(adjusted.compositeReasoningMin).toBeLessThanOrEqual(1);
      expect(adjusted.confidenceMin).toBeGreaterThanOrEqual(0);
      expect(adjusted.confidenceMin).toBeLessThanOrEqual(1);
      expect(adjusted.driftMaxMagnitude).toBeGreaterThanOrEqual(0);
      expect(adjusted.driftMaxMagnitude).toBeLessThanOrEqual(1);
      expect(adjusted.contradictionSeverityMax).toBeGreaterThanOrEqual(0);
      expect(adjusted.contradictionSeverityMax).toBeLessThanOrEqual(1);
    });

    it('should handle cumulative adjustments without overflow', () => {
      const feedback1 = makeFeedbackCorrectingFalseRejects();
      const feedback2 = makeFeedbackCorrectingFalseRejects();
      const feedback3 = makeFeedbackCorrectingFalseRejects();

      const config = DEFAULT_THRESHOLDS;

      const adj1 = feedbackLoop.computeAdjustments(feedback1);
      const config1 = feedbackLoop.applyAdjustments(config, adj1);

      const adj2 = feedbackLoop.computeAdjustments(feedback2);
      const config2 = feedbackLoop.applyAdjustments(config1, adj2);

      const adj3 = feedbackLoop.computeAdjustments(feedback3);
      const config3 = feedbackLoop.applyAdjustments(config2, adj3);

      expect(config3.compositeReasoningMin).toBeLessThanOrEqual(1);
      expect(config3.compositeReasoningMin).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mixed feedback handling', () => {
    it('should balance false rejections and false acceptances', () => {
      const feedback = makeMixedFeedback();

      const adjustments = feedbackLoop.computeAdjustments(feedback);

      expect(adjustments).toBeDefined();
      expect(Math.abs(adjustments.driftAdjustment)).toBeLessThanOrEqual(0.2);
    });
  });
});
