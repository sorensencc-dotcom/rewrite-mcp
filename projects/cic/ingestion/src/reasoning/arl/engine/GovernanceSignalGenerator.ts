import { ThresholdResult, REJECT_CODES } from '../contracts/ThresholdConfig';
import {
  GovernanceSignal,
  ESCALATION_PATHS,
} from '../contracts/GovernanceSignal';

export class GovernanceSignalGenerator {
  generate(
    thresholdResult: ThresholdResult,
    expansionId: string,
    driftVector?: {
      semantic: number;
      temporal: number;
      narrative: number;
      causal: number;
      magnitude: number;
    }
  ): GovernanceSignal {
    const reasons = this.buildReasons(thresholdResult);
    const narrativeRiskLevel = this.assessNarrativeRisk(thresholdResult);
    const escalationPath = this.determineEscalationPath(thresholdResult);

    return {
      phaseId: '7.12',
      decision: this.mapDecision(thresholdResult.decision),
      reasons,
      driftVector,
      narrativeRiskLevel,
      operatorOverrideAllowed:
        thresholdResult.decision === 'QUARANTINE' ||
        thresholdResult.decision === 'REJECT',
      escalationPath: escalationPath?.name,
      auditEntry: {
        timestamp: new Date(),
        phaseId: '7.12',
        decision: thresholdResult.decision,
        reasonCount: reasons.length,
      },
    };
  }

  private buildReasons(thresholdResult: ThresholdResult): string[] {
    const reasons: string[] = [];

    if (thresholdResult.decision === 'ACCEPT') {
      reasons.push(
        `All ${thresholdResult.passed.length} threshold checks passed`
      );
      return reasons;
    }

    // For REJECT/QUARANTINE, detail each failure
    for (const failure of thresholdResult.failed) {
      const delta = Math.abs(failure.actual - failure.threshold).toFixed(3);
      reasons.push(
        `${failure.name}: ${failure.actual.toFixed(3)} (threshold: ${failure.threshold.toFixed(3)}, gap: ${delta})`
      );
    }

    if (thresholdResult.rejectCode) {
      const codeMap: Record<string, string> = {
        [REJECT_CODES.COMPOSITE_TOO_LOW]:
          'Composite reasoning insufficient for safe expansion',
        [REJECT_CODES.CONFIDENCE_TOO_LOW]:
          'Low confidence in reasoning verdict',
        [REJECT_CODES.DRIFT_TOO_HIGH]:
          'Expansion causes unacceptable semantic drift',
        [REJECT_CODES.CONTRADICTION_TOO_SEVERE]:
          'Expansion introduces critical narrative contradictions',
        [REJECT_CODES.MULTIPLE_FAILURES]:
          'Multiple reasoning subsystems below acceptable thresholds',
      };

      const humanReadable = codeMap[thresholdResult.rejectCode];
      if (humanReadable) {
        reasons.push(humanReadable);
      }
    }

    return reasons;
  }

  private assessNarrativeRisk(
    thresholdResult: ThresholdResult
  ): 'low' | 'medium' | 'high' {
    if (thresholdResult.decision === 'ACCEPT') {
      return 'low';
    }

    if (thresholdResult.decision === 'QUARANTINE') {
      const failureCount = thresholdResult.failed.length;
      if (failureCount === 1) return 'medium';
      return 'high';
    }

    // REJECT
    return 'high';
  }

  private determineEscalationPath(
    thresholdResult: ThresholdResult
  ): (typeof ESCALATION_PATHS)[keyof typeof ESCALATION_PATHS] | undefined {
    if (thresholdResult.decision === 'ACCEPT') {
      return undefined; // No escalation needed
    }

    // Check for specific failure types to route to appropriate handler
    const failureNames = thresholdResult.failed.map((f) => f.name);

    if (failureNames.includes('Drift Magnitude')) {
      return ESCALATION_PATHS.MEMORY_INTEGRITY;
    }

    if (
      failureNames.includes('Contradiction Severity') ||
      failureNames.includes('Narrative') // If we had narrative-specific checks
    ) {
      return ESCALATION_PATHS.NARRATIVE_COHERENCE;
    }

    // Default to operator review for ambiguous cases
    return ESCALATION_PATHS.OPERATOR_REVIEW;
  }

  private mapDecision(
    thresholdDecision: 'ACCEPT' | 'REJECT' | 'QUARANTINE'
  ): 'ACCEPT' | 'REJECT' | 'QUARANTINE' | 'ESCALATE' {
    // For now, map directly; in future might split REJECT into ESCALATE
    if (thresholdDecision === 'QUARANTINE') {
      return 'ESCALATE'; // QUARANTINE triggers escalation in governance
    }
    return thresholdDecision;
  }
}
