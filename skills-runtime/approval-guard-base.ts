/**
 * Base Approval Guard
 *
 * All approval sources inherit from this to provide consistent
 * autonomous mode behavior: auto-approve safe, auto-reject risky,
 * fail-fast unknown.
 */

import { isAutonomousMode } from './autonomous-context';
import { getAutonomousDecisionEngine, AutoDecision } from './autonomous-decision-engine';
import { AutonomousApprovalBlockedError } from './autonomous-approval-error';

export abstract class ApprovalGuardBase {
  protected toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  /**
   * Check if operation requires approval
   * Returns null if auto-approved, throws if blocked, or returns approval needed
   */
  async checkApproval(
    operation: string,
    args: Record<string, unknown> = {}
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // If not in autonomous mode, use normal approval flow
    if (!isAutonomousMode()) {
      return this.normalApprovalFlow(operation, args);
    }

    // In autonomous mode: auto-decide
    const decision = getAutonomousDecisionEngine().autoDecide(operation, this.toolName, args);

    if (decision.decision === 'approve') {
      // Log and proceed silently
      this.logAutonomousDecision(decision, 'approve');
      return { requiresApproval: false };
    }

    if (decision.decision === 'reject') {
      // Log and fail fast
      this.logAutonomousDecision(decision, 'reject');
      throw new AutonomousApprovalBlockedError({
        operation,
        tool: this.toolName,
        reason: decision.reason,
        riskLevel: decision.details?.riskLevel as 'low' | 'medium' | 'high' | undefined,
        guidance: `This ${decision.details?.riskLevel ?? 'unknown'}-risk operation cannot be auto-approved during autonomous execution.`,
      });
    }

    // Unknown/blocked
    this.logAutonomousDecision(decision, 'blocked');
    throw new AutonomousApprovalBlockedError({
      operation,
      tool: this.toolName,
      reason: decision.reason,
      riskLevel: 'high',
      guidance: `Unknown operation: ${this.toolName}:${operation} — cannot auto-decide. Use normal (non-autonomous) mode or whitelist this operation.`,
    });
  }

  /**
   * Normal approval flow (non-autonomous mode)
   * Subclasses implement their specific approval logic
   */
  protected abstract normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }>;

  /**
   * Log autonomous decision for audit trail
   */
  protected logAutonomousDecision(decision: AutoDecision, action: 'approve' | 'reject' | 'blocked'): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      operation: decision.operation,
      tool: decision.tool,
      reason: decision.reason,
      autonomousDecision: true,
    };

    // In production, this would write to autonomous-decisions.log
    // For now, log to console in debug mode
    if (process.env.DEBUG_AUTONOMOUS) {
      console.log(`[AUTONOMOUS] ${action.toUpperCase()}: ${decision.tool}:${decision.operation}`);
    }
  }
}
