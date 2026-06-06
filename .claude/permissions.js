#!/usr/bin/env node

/**
 * Claude Code Permission Manager Integration
 *
 * Initializes on Claude Code startup to:
 * - Load whitelist configuration (9 high-frequency tools)
 * - Check permissions before tool calls
 * - Auto-approve whitelisted operations
 * - Cache approval decisions (1-hour TTL)
 *
 * Usage: Import in any MCP server or Claude Code extension
 *   import { getPermissionManager } from './.claude/permissions.js'
 *   const pm = getPermissionManager()
 *   const result = pm.checkPermission('call', 'helm:ideas-summary')
 */

import path from "path";
import { fileURLToPath } from "url";
import { PermissionManager } from "../skills-runtime/permission-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let permissionManager = null;

/**
 * Initialize permission manager on startup
 */
function initializePermissions() {
  if (permissionManager) return permissionManager;

  try {
    permissionManager = new PermissionManager();

    const summary = permissionManager.getSummary();

    // Log initialization
    console.log(`\n✅ CLAUDE CODE PERMISSION MANAGER INITIALIZED`);
    console.log(`   Whitelisted tools: ${summary.config.whitelistCount}`);
    console.log(`   Cache TTL: ${summary.config.cacheExpiry}ms`);
    console.log(`   Auto-approval enabled: Yes\n`);

    return permissionManager;
  } catch (e) {
    console.error(
      `❌ Failed to initialize permission manager: ${e.message}`
    );
    throw e;
  }
}

/**
 * Get initialized permission manager
 */
function getPermissionManager() {
  if (!permissionManager) {
    initializePermissions();
  }
  return permissionManager;
}

/**
 * Check if tool requires approval
 * Returns: { requires: boolean, reason: string, autoApproved?: boolean }
 */
function checkPermission(operation, tool, args = {}) {
  const pm = getPermissionManager();
  return pm.checkPermission(operation, tool, args);
}

/**
 * Record an approval decision
 */
function recordApproval(operation, tool, approved = true, reason = "manual") {
  const pm = getPermissionManager();
  return pm.recordApproval(operation, tool, approved, reason);
}

/**
 * Get permission summary for logging
 */
function getSummary() {
  const pm = getPermissionManager();
  return pm.getSummary();
}

/**
 * Log whitelist status (useful for debugging)
 */
function logWhitelistStatus() {
  const pm = getPermissionManager();
  const summary = pm.getSummary();

  console.log("\n📋 PERMISSION MANAGER STATUS");
  console.log(`   Whitelisted: ${summary.config.whitelistCount} tools`);
  console.log(`   Cache enabled: ${summary.config.cacheEnabled}`);
  console.log(`   Cache TTL: ${summary.config.cacheExpiry}ms`);
  console.log(`   Total tracked: ${summary.stats.totalRequests}`);
  console.log(`   Auto-approved: ${summary.stats.autoApproved}`);
  console.log(`   Cached: ${summary.stats.cachedApprovals}`);
  console.log(`   Manual: ${summary.stats.manualApprovals}`);
  console.log(`   Auto-approval rate: ${summary.autoApprovalRate}\n`);
}

/**
 * Initialize on module load
 */
initializePermissions();

export {
  getPermissionManager,
  checkPermission,
  recordApproval,
  getSummary,
  logWhitelistStatus,
};
