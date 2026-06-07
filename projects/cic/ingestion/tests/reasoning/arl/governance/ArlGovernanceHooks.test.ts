import { describe, it, expect, beforeEach } from 'vitest';
import { ArlGovernanceHooks } from '../../../../src/reasoning/arl/governance/ArlGovernanceHooks';
import { REJECT_CODES } from '../../../../src/reasoning/arl/contracts/ThresholdConfig';
import { GovernanceSignal } from '../../../../src/reasoning/arl/contracts/GovernanceSignal';

describe('ArlGovernanceHooks — Phase 7.13 BOB Integration', () => {
  let hooks: ArlGovernanceHooks;

  beforeEach(() => {
    hooks = new ArlGovernanceHooks();
  });

  describe('Governance Rule Initialization', () => {
    it('should initialize all five governance rules for reject codes', () => {
      // Rules should be initialized for each reject code
      const stats = hooks.getStats();
      expect(stats.totalDecisions).toBe(0); // Starts empty
    });
  });

  describe('ACCEPT Decision Handling', () => {
    it('should log audit entry for accepted expansion without escalation', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'ACCEPT',
        reasons: ['All thresholds passed'],
        narrativeRiskLevel: 'low',
        operatorOverrideAllowed: false,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'ACCEPT',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeNull(); // No escalation for ACCEPT
      const logs = hooks.getAuditLog();
      expect(logs.length).toBe(1);
      expect(logs[0].decision).toBe('ACCEPT');
    });
  });

  describe('Escalation Routing', () => {
    it('should route COMPOSITE_TOO_LOW to operator review', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'QUARANTINE',
        reasons: ['Composite reasoning below threshold'],
        narrativeRiskLevel: 'medium',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.COMPOSITE_TOO_LOW,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'QUARANTINE',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeDefined();
      expect(result?.handler).toBe('operator_review');
      expect(result?.status).toBe('pending');
    });

    it('should route DRIFT_TOO_HIGH to memory integrity check', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'ESCALATE',
        reasons: ['Drift magnitude exceeds threshold'],
        narrativeRiskLevel: 'medium',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
        driftVector: {
          semantic: 0.35,
          temporal: 0.20,
          narrative: 0.25,
          causal: 0.32,
          magnitude: 0.35,
        },
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'ESCALATE',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeDefined();
      expect(result?.handler).toBe('memory_integrity_check');
    });

    it('should route CONTRADICTION_TOO_SEVERE to narrative coherence review', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'REJECT',
        reasons: ['Contradiction severity exceeds threshold'],
        narrativeRiskLevel: 'high',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.CONTRADICTION_TOO_SEVERE,
        escalationPath: 'narrative_coherence_review',
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'REJECT',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeDefined();
      expect(result?.handler).toBe('narrative_coherence_review');
    });

    it('should route CONFIDENCE_TOO_LOW to operator review', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'ESCALATE',
        reasons: ['Confidence below threshold'],
        narrativeRiskLevel: 'medium',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.CONFIDENCE_TOO_LOW,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'ESCALATE',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeDefined();
      expect(result?.handler).toBe('operator_review');
    });

    it('should route MULTIPLE_FAILURES to operator review', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'REJECT',
        reasons: [
          'Composite reasoning below threshold',
          'Confidence below threshold',
          'Drift magnitude exceeds threshold',
        ],
        narrativeRiskLevel: 'high',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.MULTIPLE_FAILURES,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'REJECT',
          reasonCount: 3,
        },
      };

      const result = await hooks.processSignal(signal);

      expect(result).toBeDefined();
      expect(result?.handler).toBe('operator_review');
    });
  });

  describe('Audit Logging', () => {
    it('should track all governance decisions in audit log', async () => {
      const signal1: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'ACCEPT',
        reasons: ['All thresholds passed'],
        narrativeRiskLevel: 'low',
        operatorOverrideAllowed: false,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'ACCEPT',
          reasonCount: 1,
        },
      };

      const signal2: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'QUARANTINE',
        reasons: ['Drift magnitude exceeds threshold'],
        narrativeRiskLevel: 'medium',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'QUARANTINE',
          reasonCount: 1,
        },
      };

      await hooks.processSignal(signal1);
      await hooks.processSignal(signal2);

      const logs = hooks.getAuditLog();
      expect(logs.length).toBe(2);
      expect(logs[0].decision).toBe('ACCEPT');
      expect(logs[1].decision).toBe('QUARANTINE');
    });

    it('should support audit log filtering by reject code', async () => {
      const signals: GovernanceSignal[] = [
        {
          phaseId: '7.12',
          decision: 'QUARANTINE',
          reasons: ['Drift too high'],
          narrativeRiskLevel: 'medium',
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'QUARANTINE',
            reasonCount: 1,
          },
        },
        {
          phaseId: '7.12',
          decision: 'ESCALATE',
          reasons: ['Confidence too low'],
          narrativeRiskLevel: 'medium',
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.CONFIDENCE_TOO_LOW,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'ESCALATE',
            reasonCount: 1,
          },
        },
      ];

      for (const signal of signals) {
        await hooks.processSignal(signal);
      }

      const driftLogs = hooks.getAuditLog({
        rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
      });
      expect(driftLogs.length).toBe(1);
      expect(driftLogs[0].rejectCode).toBe(REJECT_CODES.DRIFT_TOO_HIGH);
    });
  });

  describe('Operator Override Handling', () => {
    it('should record operator approval override', async () => {
      // Process initial escalation
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'QUARANTINE',
        reasons: ['Drift too high'],
        narrativeRiskLevel: 'medium',
        operatorOverrideAllowed: true,
        rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'QUARANTINE',
          reasonCount: 1,
        },
      };

      const result = await hooks.processSignal(signal);
      expect(result).toBeDefined();

      // Record operator override
      await hooks.handleOperatorOverride(
        'exp-123',
        result!.escalationId,
        'approved',
        'Expansion approved despite drift due to critical urgency'
      );

      const logs = hooks.getAuditLog();
      expect(logs.length).toBe(2); // Initial + override
      const overrideLogs = logs.filter((l) => l.operatorAction);
      expect(overrideLogs.length).toBe(1);
      expect(overrideLogs[0].operatorAction).toBe('approved');
    });

    it('should record operator rejection override', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'ACCEPT',
        reasons: ['All thresholds passed'],
        narrativeRiskLevel: 'low',
        operatorOverrideAllowed: false,
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'ACCEPT',
          reasonCount: 1,
        },
      };

      await hooks.processSignal(signal);

      // Operator can reject even accepted expansions if needed
      await hooks.handleOperatorOverride(
        'exp-124',
        'esc-manual-001',
        'rejected',
        'Expansion contradicts upcoming policy change'
      );

      const logs = hooks.getAuditLog();
      const overrideLogs = logs.filter((l) => l.operatorAction === 'rejected');
      expect(overrideLogs.length).toBe(1);
    });
  });

  describe('Statistics and Reporting', () => {
    it('should track decision statistics', async () => {
      const signals: GovernanceSignal[] = [
        {
          phaseId: '7.12',
          decision: 'ACCEPT',
          reasons: ['All pass'],
          narrativeRiskLevel: 'low',
          operatorOverrideAllowed: false,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'ACCEPT',
            reasonCount: 1,
          },
        },
        {
          phaseId: '7.12',
          decision: 'ACCEPT',
          reasons: ['All pass'],
          narrativeRiskLevel: 'low',
          operatorOverrideAllowed: false,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'ACCEPT',
            reasonCount: 1,
          },
        },
        {
          phaseId: '7.12',
          decision: 'QUARANTINE',
          reasons: ['One failure'],
          narrativeRiskLevel: 'medium',
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'QUARANTINE',
            reasonCount: 1,
          },
        },
        {
          phaseId: '7.12',
          decision: 'REJECT',
          reasons: ['Multiple failures'],
          narrativeRiskLevel: 'high',
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.MULTIPLE_FAILURES,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'REJECT',
            reasonCount: 3,
          },
        },
      ];

      for (const signal of signals) {
        await hooks.processSignal(signal);
      }

      const stats = hooks.getStats();
      expect(stats.totalDecisions).toBe(4);
      expect(stats.accepted).toBe(2);
      expect(stats.quarantined).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it('should show real-time approval percentage', async () => {
      // 80% accept, 10% quarantine, 10% reject scenario
      const signals = [
        // 8 accepts
        ...Array(8).fill(null).map(() => ({
          phaseId: '7.12' as const,
          decision: 'ACCEPT' as const,
          reasons: ['All pass'],
          narrativeRiskLevel: 'low' as const,
          operatorOverrideAllowed: false,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'ACCEPT',
            reasonCount: 1,
          },
        })),
        // 1 quarantine
        {
          phaseId: '7.12' as const,
          decision: 'QUARANTINE' as const,
          reasons: ['One failure'],
          narrativeRiskLevel: 'medium' as const,
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'QUARANTINE',
            reasonCount: 1,
          },
        },
        // 1 reject
        {
          phaseId: '7.12' as const,
          decision: 'REJECT' as const,
          reasons: ['Multiple failures'],
          narrativeRiskLevel: 'high' as const,
          operatorOverrideAllowed: true,
          rejectCode: REJECT_CODES.MULTIPLE_FAILURES,
          auditEntry: {
            timestamp: new Date(),
            phaseId: '7.12',
            decision: 'REJECT',
            reasonCount: 3,
          },
        },
      ];

      for (const signal of signals) {
        await hooks.processSignal(signal);
      }

      const stats = hooks.getStats();
      expect(stats.accepted).toBe(8);
      expect(stats.quarantined).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.accepted / stats.totalDecisions).toBeCloseTo(0.8, 1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown reject code', async () => {
      const signal: GovernanceSignal = {
        phaseId: '7.12',
        decision: 'REJECT',
        reasons: ['Unknown error'],
        narrativeRiskLevel: 'high',
        operatorOverrideAllowed: true,
        rejectCode: 'E999_unknown_error',
        auditEntry: {
          timestamp: new Date(),
          phaseId: '7.12',
          decision: 'REJECT',
          reasonCount: 1,
        },
      };

      await expect(hooks.processSignal(signal)).rejects.toThrow(
        'No governance rule found for code: E999_unknown_error'
      );
    });
  });
});
