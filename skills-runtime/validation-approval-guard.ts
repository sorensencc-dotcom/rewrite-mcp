/**
 * Validation Operations Approval Guard
 * Handles: lint, type-check, schema validation, and related checks
 */

import { ApprovalGuardBase } from './approval-guard-base';

export class ValidationApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('validation');
  }

  protected async normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // All validation checks are safe (read-only)
    const safeOps = [
      'lint',
      'type-check',
      'schema-validate',
      'audit',
      'check',
      'analyze',
      'scan',
    ];

    if (safeOps.some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Auto-fix/apply operations are risky
    const riskyOps = ['fix', 'apply', 'format', 'auto-fix', 'auto-format'];

    if (riskyOps.some((op) => operation.includes(op))) {
      return { requiresApproval: true, reason: `validation:${operation} is a write operation` };
    }

    // Default: needs approval
    return { requiresApproval: true, reason: `validation:${operation} requires approval` };
  }
}

export const validationApprovalGuard = new ValidationApprovalGuard();
