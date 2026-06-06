import { describe, it, expect, beforeEach } from 'vitest';
import { ThresholdModel } from '../../../../src/reasoning/arl/engine/ThresholdModel';
import { DEFAULT_THRESHOLDS, REJECT_CODES } from '../../../../src/reasoning/arl/contracts/ThresholdConfig';

describe('ThresholdModel — Phase 7.12 Deterministic Decision Engine', () => {
  let model: ThresholdModel;

  beforeEach(() => {
    model = new ThresholdModel();
  });

  describe('Happy Path — All thresholds pass', () => {
    it('should ACCEPT when all metrics pass', () => {
      const result = model.evaluate({
        compositeReasoning: 0.85,
        confidence: 0.82,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('ACCEPT');
      expect(result.rejectCode).toBeUndefined();
      expect(result.passed.length).toBe(4);
      expect(result.failed.length).toBe(0);
    });

    it('should ACCEPT at exact threshold boundaries', () => {
      const result = model.evaluate({
        compositeReasoning: DEFAULT_THRESHOLDS.compositeReasoningMin,
        confidence: DEFAULT_THRESHOLDS.confidenceMin,
        driftMagnitude: DEFAULT_THRESHOLDS.driftMaxMagnitude,
        contradictionSeverity: DEFAULT_THRESHOLDS.contradictionSeverityMax,
      });

      expect(result.decision).toBe('ACCEPT');
      expect(result.failed.length).toBe(0);
    });
  });

  describe('Single Failure — QUARANTINE', () => {
    it('should QUARANTINE when composite reasoning is too low', () => {
      const result = model.evaluate({
        compositeReasoning: 0.70, // Below 0.75 minimum
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.rejectCode).toBe(REJECT_CODES.COMPOSITE_TOO_LOW);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].name).toBe('Composite Reasoning');
    });

    it('should QUARANTINE when confidence is too low', () => {
      const result = model.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.65, // Below 0.70 minimum
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.rejectCode).toBe(REJECT_CODES.CONFIDENCE_TOO_LOW);
      expect(result.failed[0].name).toBe('Confidence Level');
    });

    it('should QUARANTINE when drift magnitude exceeds threshold', () => {
      const result = model.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: 0.35, // Above 0.30 maximum
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.rejectCode).toBe(REJECT_CODES.DRIFT_TOO_HIGH);
      expect(result.failed[0].name).toBe('Drift Magnitude');
    });

    it('should QUARANTINE when contradiction severity exceeds threshold', () => {
      const result = model.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.25, // Above 0.20 maximum
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.rejectCode).toBe(REJECT_CODES.CONTRADICTION_TOO_SEVERE);
      expect(result.failed[0].name).toBe('Contradiction Severity');
    });
  });

  describe('Multiple Failures — REJECT', () => {
    it('should REJECT when two thresholds fail', () => {
      const result = model.evaluate({
        compositeReasoning: 0.65, // Below min
        confidence: 0.65, // Below min
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('REJECT');
      expect(result.rejectCode).toBe(REJECT_CODES.MULTIPLE_FAILURES);
      expect(result.failed.length).toBe(2);
    });

    it('should REJECT when three thresholds fail', () => {
      const result = model.evaluate({
        compositeReasoning: 0.60,
        confidence: 0.60,
        driftMagnitude: 0.50,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('REJECT');
      expect(result.rejectCode).toBe(REJECT_CODES.MULTIPLE_FAILURES);
      expect(result.failed.length).toBe(3);
    });

    it('should REJECT when all four thresholds fail', () => {
      const result = model.evaluate({
        compositeReasoning: 0.50,
        confidence: 0.50,
        driftMagnitude: 0.50,
        contradictionSeverity: 0.50,
      });

      expect(result.decision).toBe('REJECT');
      expect(result.rejectCode).toBe(REJECT_CODES.MULTIPLE_FAILURES);
      expect(result.failed.length).toBe(4);
      expect(result.passed.length).toBe(0);
    });
  });

  describe('Boundary Conditions', () => {
    it('should fail if composite reasoning is 0.001 below threshold', () => {
      const result = model.evaluate({
        compositeReasoning: DEFAULT_THRESHOLDS.compositeReasoningMin - 0.001,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.failed.length).toBe(1);
    });

    it('should pass if composite reasoning is 0.001 above threshold', () => {
      const result = model.evaluate({
        compositeReasoning: DEFAULT_THRESHOLDS.compositeReasoningMin + 0.001,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('ACCEPT');
      expect(result.failed.length).toBe(0);
    });

    it('should fail if drift is 0.001 above threshold', () => {
      const result = model.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: DEFAULT_THRESHOLDS.driftMaxMagnitude + 0.001,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.failed[0].name).toBe('Drift Magnitude');
    });
  });

  describe('Custom Thresholds', () => {
    it('should accept custom threshold configuration', () => {
      const customModel = new ThresholdModel({
        compositeReasoningMin: 0.9,
        confidenceMin: 0.95,
      });

      const result = customModel.evaluate({
        compositeReasoning: 0.85,
        confidence: 0.90,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('REJECT');
      expect(result.failed.length).toBe(2);
    });
  });

  describe('Detailed Check Information', () => {
    it('should provide actual vs threshold values for passed checks', () => {
      const result = model.evaluate({
        compositeReasoning: 0.85,
        confidence: 0.82,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const compositeCheck = result.passed.find((c) => c.name === 'Composite Reasoning');
      expect(compositeCheck?.actual).toBe(0.85);
      expect(compositeCheck?.threshold).toBe(DEFAULT_THRESHOLDS.compositeReasoningMin);
      expect(compositeCheck?.pass).toBe(true);
    });

    it('should provide actual vs threshold values for failed checks', () => {
      const result = model.evaluate({
        compositeReasoning: 0.65,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const compositeCheck = result.failed.find((c) => c.name === 'Composite Reasoning');
      expect(compositeCheck?.actual).toBe(0.65);
      expect(compositeCheck?.threshold).toBe(DEFAULT_THRESHOLDS.compositeReasoningMin);
      expect(compositeCheck?.pass).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a high-quality expansion candidate', () => {
      const result = model.evaluate({
        compositeReasoning: 0.92,
        confidence: 0.88,
        driftMagnitude: 0.08,
        contradictionSeverity: 0.05,
      });

      expect(result.decision).toBe('ACCEPT');
    });

    it('should handle a marginal expansion candidate requiring review', () => {
      const result = model.evaluate({
        compositeReasoning: 0.76,
        confidence: 0.71,
        driftMagnitude: 0.25,
        contradictionSeverity: 0.18,
      });

      expect(result.decision).toBe('ACCEPT');
    });

    it('should quarantine when drift rises during expansion', () => {
      const result = model.evaluate({
        compositeReasoning: 0.82,
        confidence: 0.78,
        driftMagnitude: 0.35, // Unexpected drift spike
        contradictionSeverity: 0.10,
      });

      expect(result.decision).toBe('QUARANTINE');
      expect(result.rejectCode).toBe(REJECT_CODES.DRIFT_TOO_HIGH);
    });

    it('should reject when expansion introduces contradictions', () => {
      const result = model.evaluate({
        compositeReasoning: 0.45,
        confidence: 0.55,
        driftMagnitude: 0.45,
        contradictionSeverity: 0.60, // Critical contradiction detected
      });

      expect(result.decision).toBe('REJECT');
      expect(result.failed.length).toBe(4);
    });
  });
});
