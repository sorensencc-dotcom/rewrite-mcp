/**
 * Git Operations Approval Guard
 * Handles: git add, commit, push, pull, merge, etc.
 */

import { ApprovalGuardBase } from './approval-guard-base';

export class GitApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('git');
  }

  protected async normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // Non-autonomous mode: normal approval/permission flow
    // Check against configured whitelist/permissions
    const safeOps = ['add', 'status', 'log', 'diff', 'show', 'ls-files', 'rev-parse'];

    if (safeOps.some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Anything else in normal mode still needs approval
    return { requiresApproval: true, reason: `git:${operation} requires approval` };
  }
}

export const gitApprovalGuard = new GitApprovalGuard();
