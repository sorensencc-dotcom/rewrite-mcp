import { GovernanceSignal } from '../contracts/GovernanceSignal';
export interface GovernanceRule {
    id: string;
    rejectCode: string;
    trigger: string;
    action: 'reject' | 'quarantine' | 'escalate';
    handler: string;
    priority: 'low' | 'medium' | 'high';
    conditions?: string[];
}
export interface EscalationHandler {
    id: string;
    name: string;
    description: string;
    trigger: GovernanceRule;
    execute: (signal: GovernanceSignal) => Promise<EscalationResult>;
}
export interface EscalationResult {
    escalationId: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'failed';
    handler: string;
    completedAt?: Date;
    operator_action?: 'approved' | 'rejected' | 'modified';
}
export interface AuditLogEntry {
    timestamp: Date;
    phaseId: string;
    expansionId: string;
    decision: string;
    rejectCode?: string;
    escalationId?: string;
    operatorAction?: string;
    notes?: string;
}
/**
 * Phase 7.13 — Governance Hooks
 * Wires ARL threshold decisions (Phase 7.12) into BOB governance engine
 */
export declare class ArlGovernanceHooks {
    private rules;
    private handlers;
    private auditLog;
    constructor();
    /**
     * Initialize governance rules based on ARL reject codes
     */
    private initializeRules;
    /**
     * Initialize escalation handlers
     */
    private initializeHandlers;
    /**
     * Process a governance signal through BOB governance engine
     */
    processSignal(signal: GovernanceSignal): Promise<EscalationResult | null>;
    /**
     * Handle operator override — operator can override QUARANTINE/REJECT decisions
     */
    handleOperatorOverride(expansionId: string, escalationId: string, decision: 'approved' | 'rejected' | 'modified', reasoning: string): Promise<void>;
    /**
     * Get audit log entries
     */
    getAuditLog(filters?: {
        phaseId?: string;
        expansionId?: string;
        rejectCode?: string;
        since?: Date;
    }): AuditLogEntry[];
    /**
     * Get governance statistics
     */
    getStats(): {
        totalDecisions: number;
        accepted: number;
        quarantined: number;
        rejected: number;
        operatorOverrides: number;
    };
    /**
     * Log a governance decision to audit trail
     */
    private logAudit;
}
//# sourceMappingURL=ArlGovernanceHooks.d.ts.map