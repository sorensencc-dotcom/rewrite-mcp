import { GovernanceSignal, ESCALATION_PATHS } from '../contracts/GovernanceSignal';
import { ThresholdResult } from '../contracts/ThresholdConfig';

interface DriftVector {
  semantic: number;
  temporal: number;
  narrative: number;
  causal: number;
}

export class GovernanceHookExecutor {
  private auditLog: GovernanceSignal[] = [];

  executeThreshold(
    phaseId: string,
    thresholdResult: ThresholdResult,
    driftVector: DriftVector,
    narrativeRiskLevel: 'low' | 'medium' | 'high'
  ): GovernanceSignal {
    const reasons = this.buildReasonStrings(thresholdResult);
    const driftMagnitude = Math.sqrt(
      driftVector.semantic ** 2 +
        driftVector.temporal ** 2 +
        driftVector.narrative ** 2 +
        driftVector.causal ** 2
    );

    let decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE' | 'ESCALATE';
    let escalationPath: string | undefined;

    if (thresholdResult.decision === 'ACCEPT') {
      decision = 'ACCEPT';
    } else if (thresholdResult.decision === 'REJECT') {
      decision = 'REJECT';
      if (narrativeRiskLevel === 'high') {
        escalationPath = 'narrative_coherence_check';
      }
    } else {
      // QUARANTINE
      decision = 'ESCALATE';
      if (driftMagnitude > 0.25) {
        escalationPath = 'memory_integrity_check';
      } else if (narrativeRiskLevel === 'medium' || narrativeRiskLevel === 'high') {
        escalationPath = 'narrative_coherence_check';
      } else {
        escalationPath = 'operator_review';
      }
    }

    const signal: GovernanceSignal = {
      phaseId,
      decision,
      reasons,
      driftVector,
      narrativeRiskLevel,
      operatorOverrideAllowed: decision !== 'REJECT',
      escalationPath,
      auditEntry: {
        timestamp: new Date(),
        phaseId,
        decision,
        reasonCount: reasons.length,
      },
    };

    this.auditLog.push(signal);
    return signal;
  }

  private buildReasonStrings(result: ThresholdResult): string[] {
    const reasons: string[] = [];
    for (const check of result.failed) {
      reasons.push(
        `${check.name} failed: expected ${check.threshold}, got ${check.actual.toFixed(3)}`
      );
    }
    if (result.rejectCode) {
      reasons.push(`Error code: ${result.rejectCode}`);
    }
    return reasons;
  }

  getAuditLog(): GovernanceSignal[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }
}
