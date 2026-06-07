/**
 * NPM Commands Approval Guard
 * Handles: npm install, test, build, publish, etc.
 */

import { ApprovalGuardBase } from './approval-guard-base';

export class NpmApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('npm');
  }

  protected async normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // Non-autonomous mode: normal approval/permission flow
    const safeOps = ['list', 'ls', 'view', 'info', 'version', 'audit'];

    if (safeOps.some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Build/test are typically safe but could require approval
    if (['test', 'build', 'compile'].some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Anything else needs approval
    return { requiresApproval: true, reason: `npm:${operation} requires approval` };
  }
}

export const npmApprovalGuard = new NpmApprovalGuard();
