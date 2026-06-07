export interface SelfGoverningThreshold {
  thresholdId: string;
  currentValue: number;
  adaptiveRange: { min: number; max: number };
  learningRate: number;
}

export interface AutonomousDecision {
  decisionId: string;
  verdict: 'ACCEPT' | 'REJECT' | 'QUARANTINE';
  confidence: number;
  reasoning: string;
  requiresOperatorReview: boolean;
}

export interface AutonomousRejection {
  rejectionId: string;
  reason: string;
  severity: number;
  timestamp: string;
}

export interface AutonomousEscalation {
  escalationId: string;
  escalationPath: string;
  severity: number;
  autoResolveAttempted: boolean;
}

export interface AutonomousStabilization {
  stabilizationId: string;
  action: string;
  impactScore: number;
  successRate: number;
}

export interface AutonomousModeState {
  id: string;
  timestamp: string;
  isAutonomous: boolean;
  thresholds: SelfGoverningThreshold[];
  recentDecisions: AutonomousDecision[];
  rejections: AutonomousRejection[];
  escalations: AutonomousEscalation[];
  stabilizations: AutonomousStabilization[];
  autonomyScore: number;
}
