export interface GovernanceSignal {
    phaseId: string;
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
    escalationPath?: string;
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
export declare const ESCALATION_PATHS: Record<string, EscalationPath>;
//# sourceMappingURL=GovernanceSignal.d.ts.map