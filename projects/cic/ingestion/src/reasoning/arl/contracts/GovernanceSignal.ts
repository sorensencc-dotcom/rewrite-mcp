export interface GovernanceSignal {
  phaseId: string; // e.g., "7.12"
  decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE' | 'ESCALATE';
  reasons: string[];
  driftVector?: {
    semantic: number;
    temporal: number;
    narrative: number;
    causal: number;
    magnitude: number;
  };
  narrativeRiskLevel: 'low' | 'medium' | 'high';
  operatorOverrideAllowed: boolean;
  escalationPath?: string; // e.g., "memory_integrity_check"
  auditEntry: {
    timestamp: Date;
    phaseId: string;
    decision: string;
    reasonCount: number;
  };
}

export interface EscalationPath {
  name: string;
  trigger: string;
  handler: string;
  priority: 'low' | 'medium' | 'high';
}

export const ESCALATION_PATHS: Record<string, EscalationPath> = {
  MEMORY_INTEGRITY: {
    name: 'Memory Integrity Check',
    trigger: 'drift_magnitude_high',
    handler: 'memory_consistency_validator',
    priority: 'high',
  },
  NARRATIVE_COHERENCE: {
    name: 'Narrative Coherence Review',
    trigger: 'narrative_risk_high',
    handler: 'narrative_continuity_enforcer',
    priority: 'medium',
  },
  OPERATOR_REVIEW: {
    name: 'Operator Manual Review',
    trigger: 'ambiguous_decision',
    handler: 'operator_dashboard',
    priority: 'high',
  },
};
