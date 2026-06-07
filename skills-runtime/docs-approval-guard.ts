/**
 * Documentation Updates Approval Guard
 * Handles: doc-update, treatment-update, and related documentation operations
 */

import { ApprovalGuardBase } from './approval-guard-base';

const SAFE_DOC_OPERATIONS = [
  'typo',
  'clarification',
  'formatting',
  'link-fix',
  'code-sample-update',
  'version-bump-docs',
];

const RISKY_DOC_OPERATIONS = ['restructure', 'breaking-change', 'api-change', 'remove-section'];

export class DocsApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('docs');
  }

  protected async normalApprovalFlow(
    operation: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // Check if operation is safe
    if (SAFE_DOC_OPERATIONS.some((op) => operation.includes(op))) {
      return { requiresApproval: false };
    }

    // Check if operation is risky
    if (RISKY_DOC_OPERATIONS.some((op) => operation.includes(op))) {
      return { requiresApproval: true, reason: `docs:${operation} is a breaking change` };
    }

    // Default: needs approval
    return { requiresApproval: true, reason: `docs:${operation} requires approval` };
  }
}

export const docsApprovalGuard = new DocsApprovalGuard();
