import { GovernanceSignal, ESCALATION_PATHS } from '../contracts/GovernanceSignal';
import { REJECT_CODES } from '../contracts/ThresholdConfig';

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
export class ArlGovernanceHooks {
  private rules: Map<string, GovernanceRule> = new Map();
  private handlers: Map<string, EscalationHandler> = new Map();
  private auditLog: AuditLogEntry[] = [];

  constructor() {
    this.initializeRules();
    this.initializeHandlers();
  }

  /**
   * Initialize governance rules based on ARL reject codes
   */
  private initializeRules(): void {
    // COMPOSITE_TOO_LOW — Insufficient reasoning quality
    this.rules.set(REJECT_CODES.COMPOSITE_TOO_LOW, {
      id: 'RULE_001',
      rejectCode: REJECT_CODES.COMPOSITE_TOO_LOW,
      trigger: 'arlThreshold.compositeReasoning < 0.75',
      action: 'quarantine',
      handler: 'operator_review',
      priority: 'medium',
      conditions: [
        'expansion.type != "metadata_only"',
        'arl.confidence > 0.7',
      ],
    });

    // CONFIDENCE_TOO_LOW — Low confidence in verdict
    this.rules.set(REJECT_CODES.CONFIDENCE_TOO_LOW, {
      id: 'RULE_002',
      rejectCode: REJECT_CODES.CONFIDENCE_TOO_LOW,
      trigger: 'arlThreshold.confidence < 0.70',
      action: 'escalate',
      handler: 'operator_review',
      priority: 'high',
      conditions: ['arl.compositeReasoning > 0.75'],
    });

    // DRIFT_TOO_HIGH — Unacceptable semantic drift
    this.rules.set(REJECT_CODES.DRIFT_TOO_HIGH, {
      id: 'RULE_003',
      rejectCode: REJECT_CODES.DRIFT_TOO_HIGH,
      trigger: 'arlThreshold.driftMagnitude > 0.30',
      action: 'escalate',
      handler: 'memory_integrity_check',
      priority: 'high',
      conditions: [
        'drift.semantic > 0.25',
        'expansion.scope != "local_addition"',
      ],
    });

    // CONTRADICTION_TOO_SEVERE — Critical narrative conflict
    this.rules.set(REJECT_CODES.CONTRADICTION_TOO_SEVERE, {
      id: 'RULE_004',
      rejectCode: REJECT_CODES.CONTRADICTION_TOO_SEVERE,
      trigger: 'arlThreshold.contradictionSeverity > 0.20',
      action: 'reject',
      handler: 'narrative_coherence_review',
      priority: 'high',
      conditions: [],
    });

    // MULTIPLE_FAILURES — Multiple subsystems below threshold
    this.rules.set(REJECT_CODES.MULTIPLE_FAILURES, {
      id: 'RULE_005',
      rejectCode: REJECT_CODES.MULTIPLE_FAILURES,
      trigger: 'arlThreshold.failureCount >= 2',
      action: 'reject',
      handler: 'operator_review',
      priority: 'high',
      conditions: [],
    });
  }

  /**
   * Initialize escalation handlers
   */
  private initializeHandlers(): void {
    // Memory Integrity Check — Validate expansion doesn't violate memory coherence
    this.handlers.set('memory_integrity_check', {
      id: 'HANDLER_001',
      name: 'Memory Integrity Check',
      description: 'Validate expansion against historical memory and entity timelines',
      trigger: this.rules.get(REJECT_CODES.DRIFT_TOO_HIGH)!,
      execute: async (signal: GovernanceSignal) => ({
        escalationId: `esc-${Date.now()}`,
        status: 'pending',
        handler: 'memory_integrity_check',
      }),
    });

    // Narrative Coherence Review — Detect and resolve narrative conflicts
    this.handlers.set('narrative_coherence_review', {
      id: 'HANDLER_002',
      name: 'Narrative Coherence Review',
      description: 'Resolve narrative contradictions and timeline inconsistencies',
      trigger: this.rules.get(REJECT_CODES.CONTRADICTION_TOO_SEVERE)!,
      execute: async (signal: GovernanceSignal) => ({
        escalationId: `esc-${Date.now()}`,
        status: 'pending',
        handler: 'narrative_coherence_review',
      }),
    });

    // Operator Manual Review — Human judgment for ambiguous cases
    this.handlers.set('operator_review', {
      id: 'HANDLER_003',
      name: 'Operator Manual Review',
      description: 'Present expansion to operator for manual decision',
      trigger: this.rules.get(REJECT_CODES.CONFIDENCE_TOO_LOW)!,
      execute: async (signal: GovernanceSignal) => ({
        escalationId: `esc-${Date.now()}`,
        status: 'pending',
        handler: 'operator_review',
      }),
    });
  }

  /**
   * Process a governance signal through BOB governance engine
   */
  async processSignal(signal: GovernanceSignal): Promise<EscalationResult | null> {
    if (signal.decision === 'ACCEPT') {
      // Log audit entry for accepted expansions
      this.logAudit({
        timestamp: new Date(),
        phaseId: '7.13',
        expansionId: signal.auditEntry.phaseId,
        decision: 'ACCEPT',
        notes: 'Expansion accepted — no governance intervention required',
      });
      return null;
    }

    // Find applicable rule for reject code
    const rule = signal.rejectCode ? this.rules.get(signal.rejectCode) : null;
    if (!rule) {
      throw new Error(`No governance rule found for code: ${signal.rejectCode}`);
    }

    // Get escalation handler
    const handler = this.handlers.get(rule.handler);
    if (!handler) {
      throw new Error(`No escalation handler found: ${rule.handler}`);
    }

    // Execute escalation
    const escalationResult = await handler.execute(signal);

    // Log audit entry
    this.logAudit({
      timestamp: new Date(),
      phaseId: '7.13',
      expansionId: signal.auditEntry.phaseId,
      decision: signal.decision,
      rejectCode: signal.rejectCode,
      escalationId: escalationResult.escalationId,
      notes: `Escalated to ${handler.name} (${rule.id})`,
    });

    return escalationResult;
  }

  /**
   * Handle operator override — operator can override QUARANTINE/REJECT decisions
   */
  async handleOperatorOverride(
    expansionId: string,
    escalationId: string,
    decision: 'approved' | 'rejected' | 'modified',
    reasoning: string
  ): Promise<void> {
    // Find and update escalation in handlers
    // This would typically update the escalation result in BOB

    // Log operator action in audit trail
    this.logAudit({
      timestamp: new Date(),
      phaseId: '7.13',
      expansionId,
      decision: decision === 'approved' ? 'OVERRIDE_APPROVED' : 'OVERRIDE_REJECTED',
      escalationId,
      operatorAction: decision,
      notes: reasoning,
    });
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filters?: {
    phaseId?: string;
    expansionId?: string;
    rejectCode?: string;
    since?: Date;
  }): AuditLogEntry[] {
    return this.auditLog.filter((entry) => {
      if (filters?.phaseId && entry.phaseId !== filters.phaseId) return false;
      if (filters?.expansionId && entry.expansionId !== filters.expansionId)
        return false;
      if (filters?.rejectCode && entry.rejectCode !== filters.rejectCode)
        return false;
      if (filters?.since && entry.timestamp < filters.since) return false;
      return true;
    });
  }

  /**
   * Get governance statistics
   */
  getStats(): {
    totalDecisions: number;
    accepted: number;
    quarantined: number;
    rejected: number;
    operatorOverrides: number;
  } {
    const stats = {
      totalDecisions: this.auditLog.length,
      accepted: 0,
      quarantined: 0,
      rejected: 0,
      operatorOverrides: 0,
    };

    for (const entry of this.auditLog) {
      if (entry.decision === 'ACCEPT') stats.accepted++;
      if (entry.decision === 'QUARANTINE') stats.quarantined++;
      if (entry.decision === 'REJECT') stats.rejected++;
      if (entry.operatorAction) stats.operatorOverrides++;
    }

    return stats;
  }

  /**
   * Log a governance decision to audit trail
   */
  private logAudit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
  }
}
