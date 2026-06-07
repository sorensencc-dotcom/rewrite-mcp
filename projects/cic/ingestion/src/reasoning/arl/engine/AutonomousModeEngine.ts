import { AutonomousModeState, SelfGoverningThreshold, AutonomousDecision, AutonomousRejection, AutonomousEscalation, AutonomousStabilization } from '../contracts/AutonomousMode';

export class AutonomousModeEngine {
  initializeAutonomousMode(): AutonomousModeState {
    return {
      id: `auto-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isAutonomous: true,
      thresholds: this.initializeThresholds(),
      recentDecisions: [],
      rejections: [],
      escalations: [],
      stabilizations: [],
      autonomyScore: 0.85,
    };
  }

  makeAutonomousDecision(
    expansionScore: number,
    confidenceLevel: number,
    state: AutonomousModeState
  ): { decision: AutonomousDecision; updatedState: AutonomousModeState } {
    const verdict = this.determineVerdict(expansionScore, confidenceLevel);
    const requiresReview = confidenceLevel < 0.7 || Math.abs(expansionScore - 0.5) > 0.3;

    const decision: AutonomousDecision = {
      decisionId: `dec-${Date.now()}`,
      verdict,
      confidence: confidenceLevel,
      reasoning: `Expansion score: ${expansionScore.toFixed(2)}, Confidence: ${confidenceLevel.toFixed(2)}`,
      requiresOperatorReview: requiresReview,
    };

    const updatedState = { ...state, recentDecisions: [decision, ...state.recentDecisions].slice(0, 10) };

    return { decision, updatedState };
  }

  autonomouslyReject(reason: string, severity: number, state: AutonomousModeState): AutonomousModeState {
    const rejection: AutonomousRejection = {
      rejectionId: `rej-${Date.now()}`,
      reason,
      severity,
      timestamp: new Date().toISOString(),
    };

    return {
      ...state,
      rejections: [rejection, ...state.rejections].slice(0, 50),
      autonomyScore: Math.max(0, state.autonomyScore - severity * 0.05),
    };
  }

  autonomouslyEscalate(path: string, severity: number, state: AutonomousModeState): AutonomousModeState {
    const escalation: AutonomousEscalation = {
      escalationId: `esc-${Date.now()}`,
      escalationPath: path,
      severity,
      autoResolveAttempted: severity < 0.5,
    };

    return {
      ...state,
      escalations: [escalation, ...state.escalations].slice(0, 50),
    };
  }

  autonomouslyStabilize(action: string, state: AutonomousModeState): AutonomousModeState {
    const stabilization: AutonomousStabilization = {
      stabilizationId: `stab-${Date.now()}`,
      action,
      impactScore: 0.3,
      successRate: 0.85,
    };

    return {
      ...state,
      stabilizations: [stabilization, ...state.stabilizations].slice(0, 50),
      autonomyScore: Math.min(1, state.autonomyScore + 0.02),
    };
  }

  private initializeThresholds(): SelfGoverningThreshold[] {
    return [
      {
        thresholdId: 'composite-reasoning-auto',
        currentValue: 0.76,
        adaptiveRange: { min: 0.65, max: 0.85 },
        learningRate: 0.001,
      },
      {
        thresholdId: 'confidence-auto',
        currentValue: 0.68,
        adaptiveRange: { min: 0.6, max: 0.8 },
        learningRate: 0.001,
      },
      {
        thresholdId: 'drift-magnitude-auto',
        currentValue: 0.28,
        adaptiveRange: { min: 0.2, max: 0.4 },
        learningRate: 0.001,
      },
      {
        thresholdId: 'contradiction-severity-auto',
        currentValue: 0.16,
        adaptiveRange: { min: 0.1, max: 0.25 },
        learningRate: 0.001,
      },
    ];
  }

  private determineVerdict(score: number, confidence: number): 'ACCEPT' | 'REJECT' | 'QUARANTINE' {
    if (score < 0.3 || confidence < 0.5) {
      return 'REJECT';
    } else if (score < 0.65 || confidence < 0.7) {
      return 'QUARANTINE';
    } else {
      return 'ACCEPT';
    }
  }
}
