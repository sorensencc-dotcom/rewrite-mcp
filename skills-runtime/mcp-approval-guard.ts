/**
 * MCP Tool Calls Approval Guard
 * Handles: helm:*, idea:*, and other MCP tool invocations
 */

import { ApprovalGuardBase } from './approval-guard-base';

const WHITELISTED_TOOLS = [
  'helm:ideas-summary',
  'helm:pri-search',
  'helm:rl-pipeline',
  'helm:cic-status',
  'helm:credit-score',
  'helm:outreach-queue',
  'helm:revenue-pipeline',
  'idea:inbox',
  'idea:list',
  'git:status',
  'git:log',
  'npm:list',
];

export class McpApprovalGuard extends ApprovalGuardBase {
  constructor() {
    super('mcp');
  }

  protected async normalApprovalFlow(
    tool: string,
    args: Record<string, unknown>
  ): Promise<{ requiresApproval: false } | { requiresApproval: true; reason: string }> {
    // Check if tool is whitelisted
    if (WHITELISTED_TOOLS.includes(tool)) {
      return { requiresApproval: false };
    }

    // Check if tool is read-only (helm:*, idea:*)
    if (tool.startsWith('helm:') || tool.startsWith('idea:')) {
      return { requiresApproval: false };
    }

    // Anything else needs approval
    return { requiresApproval: true, reason: `mcp tool:${tool} requires approval` };
  }
}

export const mcpApprovalGuard = new McpApprovalGuard();
