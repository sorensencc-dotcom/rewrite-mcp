#!/usr/bin/env node

/**
 * Autonomous Approval Integration Hook
 *
 * This file is automatically loaded by Claude Code on startup.
 * It intercepts approval checks and uses the Autonomous Approval Buffering system
 * to prevent approval interruptions during autonomous execution.
 *
 * When AUTONOMOUS_EXECUTION=true, approvals are auto-decided instead of asked.
 */

import { PermissionManager } from "../skills-runtime/permission-manager.js";

// Global permission manager instance
let permissionManagerInstance = null;

/**
 * Get or create the global permission manager
 */
function getPermissionManager() {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager();
  }
  return permissionManagerInstance;
}

/**
 * Approval decision hook - called before Claude Code asks for user approval
 *
 * Returns:
 * - { approved: true } → Auto-approved, proceed silently
 * - { approved: false, reason } → Requires approval, ask user
 * - throws Error → Approval blocked in autonomous mode
 */
function checkApprovalBeforeAsking(operation, tool, args = {}) {
  const pm = getPermissionManager();

  try {
    const result = pm.checkPermission(operation, tool, args);

    if (!result.requires) {
      // Auto-approved
      pm.recordApproval(operation, tool, true, result.reason);
      return {
        approved: true,
        reason: result.reason,
        autonomousDecision: result.autonomousDecision || false,
      };
    }

    // Requires user approval (normal mode)
    return {
      approved: false,
      reason: result.reason,
      requiresUserApproval: true,
    };
  } catch (error) {
    // Autonomous mode blocked this operation
    if (process.env.AUTONOMOUS_EXECUTION === "true") {
      // Log the blocked operation for audit trail
      console.error(`\n⛔ ${error.message}\n`);
      throw error;
    }

    // Fall through to user approval in non-autonomous mode
    return {
      approved: false,
      reason: "error-during-check",
      error: error.message,
    };
  }
}

/**
 * Initialize the integration
 * This is called when the module is loaded
 */
function initialize() {
  // Load permission manager
  const pm = getPermissionManager();

  // Log startup status
  if (process.env.AUTONOMOUS_EXECUTION === "true") {
    console.log(
      "[AAB] Autonomous Approval Buffering active — approvals will be auto-decided"
    );
  } else {
    console.log(
      "[AAB] Normal mode — whitelisted operations auto-approved, others require approval"
    );
  }

  // Log whitelist summary
  const whitelistCount = pm.config.whitelisted.length;
  console.log(`[AAB] ${whitelistCount} tools whitelisted for auto-approval`);
}

// Initialize on load
initialize();

// Export for use in Claude Code approval checks
export { getPermissionManager, checkApprovalBeforeAsking };
