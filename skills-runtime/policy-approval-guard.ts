/**
 * Policy Validation Approval Guard
 * Handles: schema validation, policy checks, governance gates
 */

import { ApprovalGuardBase } from './approval-guard-base';

export class PolicyApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('policy');
  }

  protected async normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // Non-autonomous mode: normal approval flow
    const safeOps = ['validate', 'check', 'lint', 'type-check', 'schema-validate'];

    if (safeOps.some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Policy enforcement operations require approval
    const riskyOps = ['enforce', 'apply', 'patch', 'override', 'escalate'];

    if (riskyOps.some((op) => operation.includes(op))) {
      return { requiresApproval: true, reason: `policy:${operation} enforcement requires approval` };
    }

    // Default: needs approval
    return { requiresApproval: true, reason: `policy:${operation} requires approval` };
  }
}

export const policyApprovalGuard = new PolicyApprovalGuard();
