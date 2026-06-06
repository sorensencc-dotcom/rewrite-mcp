import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceSignalGenerator } from '../../../../src/reasoning/arl/engine/GovernanceSignalGenerator';
import { ThresholdModel } from '../../../../src/reasoning/arl/engine/ThresholdModel';
import { REJECT_CODES } from '../../../../src/reasoning/arl/contracts/ThresholdConfig';
import { ESCALATION_PATHS } from '../../../../src/reasoning/arl/contracts/GovernanceSignal';

describe('GovernanceSignalGenerator — Phase 7.13 BOB Integration', () => {
  let generator: GovernanceSignalGenerator;
  let thresholdModel: ThresholdModel;

  beforeEach(() => {
    generator = new GovernanceSignalGenerator();
    thresholdModel = new ThresholdModel();
  });

  describe('ACCEPT decisions', () => {
    it('should generate low-risk signal for accepted expansion', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.85,
        confidence: 0.82,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const signal = generator.generate(thresholdResult, 'exp-001');

      expect(signal.decision).toBe('ACCEPT');
      expect(signal.narrativeRiskLevel).toBe('low');
      expect(signal.operatorOverrideAllowed).toBe(false);
      expect(signal.escalationPath).toBeUndefined();
      expect(signal.reasons).toContain('All 4 threshold checks passed');
    });
  });

  describe('QUARANTINE decisions — Single failures', () => {
    it('should route drift failures to memory integrity escalation', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: 0.35, // Above max
        contradictionSeverity: 0.10,
      });

      const signal = generator.generate(thresholdResult, 'exp-002');

      expect(signal.decision).toBe('ESCALATE');
      expect(signal.narrativeRiskLevel).toBe('medium');
      expect(signal.operatorOverrideAllowed).toBe(true);
      expect(signal.escalationPath).toBe(
        ESCALATION_PATHS.MEMORY_INTEGRITY.name
      );
      expect(signal.reasons).toContain('Expansion causes unacceptable semantic drift');
    });

    it('should route contradiction failures to narrative escalation', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.25, // Above max
      });

      const signal = generator.generate(thresholdResult, 'exp-003');

      expect(signal.decision).toBe('ESCALATE');
      expect(signal.narrativeRiskLevel).toBe('medium');
      expect(signal.escalationPath).toBe(
        ESCALATION_PATHS.NARRATIVE_COHERENCE.name
      );
      expect(signal.reasons).toContain(
        'Expansion introduces critical narrative contradictions'
      );
    });

    it('should route confidence failures to operator review', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.65, // Below min
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const signal = generator.generate(thresholdResult, 'exp-004');

      expect(signal.decision).toBe('ESCALATE');
      expect(signal.escalationPath).toBe(
        ESCALATION_PATHS.OPERATOR_REVIEW.name
      );
    });
  });

  describe('REJECT decisions — Multiple failures', () => {
    it('should mark high narrative risk for multiple failures', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.65,
        confidence: 0.60,
        driftMagnitude: 0.40,
        contradictionSeverity: 0.30,
      });

      const signal = generator.generate(thresholdResult, 'exp-005');

      expect(signal.decision).toBe('REJECT');
      expect(signal.narrativeRiskLevel).toBe('high');
      expect(signal.operatorOverrideAllowed).toBe(true);
    });

    it('should include detailed failure reasons for all subsystems', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.60,
        confidence: 0.60,
        driftMagnitude: 0.50,
        contradictionSeverity: 0.50,
      });

      const signal = generator.generate(thresholdResult, 'exp-006');

      expect(signal.reasons.length).toBeGreaterThanOrEqual(4);
      expect(signal.reasons.some((r) => r.includes('Composite Reasoning'))).toBe(true);
      expect(signal.reasons.some((r) => r.includes('Confidence Level'))).toBe(true);
      expect(signal.reasons.some((r) => r.includes('Drift Magnitude'))).toBe(true);
      expect(signal.reasons.some((r) => r.includes('Contradiction'))).toBe(true);
    });
  });

  describe('Drift Vector Integration', () => {
    it('should include drift vector in governance signal', () => {
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

      expect(signal.driftVector).toEqual(driftVector);
    });
  });

  describe('Audit Trail', () => {
    it('should include timestamp and phase info for auditing', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.80,
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const signal = generator.generate(thresholdResult, 'exp-008');

      expect(signal.auditEntry).toBeDefined();
      expect(signal.auditEntry.phaseId).toBe('7.12');
      expect(signal.auditEntry.timestamp).toBeInstanceOf(Date);
      expect(signal.auditEntry.decision).toBe('ACCEPT');
      expect(signal.auditEntry.reasonCount).toBeGreaterThan(0);
    });

    it('should track reason count for audit purposes', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.60,
        confidence: 0.60,
        driftMagnitude: 0.50,
        contradictionSeverity: 0.50,
      });

      const signal = generator.generate(thresholdResult, 'exp-009');

      expect(signal.auditEntry.reasonCount).toBe(signal.reasons.length);
    });
  });

  describe('Operator Override Policy', () => {
    it('should allow overrides for QUARANTINE decisions', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.80,
        confidence: 0.65, // Below min
        driftMagnitude: 0.15,
        contradictionSeverity: 0.10,
      });

      const signal = generator.generate(thresholdResult, 'exp-010');

      expect(signal.operatorOverrideAllowed).toBe(true);
      expect(signal.decision).toBe('ESCALATE'); // QUARANTINE maps to ESCALATE
    });

    it('should disallow overrides for ACCEPT decisions', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.90,
        confidence: 0.90,
        driftMagnitude: 0.10,
        contradictionSeverity: 0.05,
      });

      const signal = generator.generate(thresholdResult, 'exp-011');

      expect(signal.operatorOverrideAllowed).toBe(false);
    });

    it('should allow overrides for REJECT decisions', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.40,
        confidence: 0.40,
        driftMagnitude: 0.60,
        contradictionSeverity: 0.60,
      });

      const signal = generator.generate(thresholdResult, 'exp-012');

      expect(signal.operatorOverrideAllowed).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a low-quality expansion with multiple issues', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.45,
        confidence: 0.35,
        driftMagnitude: 0.55,
        contradictionSeverity: 0.55,
      });

      const signal = generator.generate(thresholdResult, 'exp-013');

      expect(signal.decision).toBe('REJECT');
      expect(signal.narrativeRiskLevel).toBe('high');
      expect(signal.operatorOverrideAllowed).toBe(true);
      expect(signal.reasons.length).toBeGreaterThan(4);
    });

    it('should handle a marginal expansion needing operator judgment', () => {
      const thresholdResult = thresholdModel.evaluate({
        compositeReasoning: 0.76, // Just above 0.75 threshold
        confidence: 0.68, // Just below 0.70 threshold
        driftMagnitude: 0.25,
        contradictionSeverity: 0.15,
      });

      const signal = generator.generate(thresholdResult, 'exp-014');

      expect(signal.decision).toBe('ESCALATE');
      expect(signal.narrativeRiskLevel).toBe('medium');
      expect(signal.operatorOverrideAllowed).toBe(true);
    });

    it('should trace a high-confidence expansion with detected drift', () => {
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

      const signal = generator.generate(
        thresholdResult,
        'exp-015',
        driftVector
      );

      expect(signal.decision).toBe('ESCALATE');
      expect(signal.narrativeRiskLevel).toBe('medium');
      expect(signal.escalationPath).toBe(
        ESCALATION_PATHS.MEMORY_INTEGRITY.name
      );
      expect(signal.driftVector?.magnitude).toBe(0.32);
    });
  });
});
