#!/usr/bin/env node

/**
 * Permission Management System
 *
 * Solves approval friction by:
 * 1. Whitelisting safe/trusted operations (auto-approve)
 * 2. Caching approval decisions (don't re-ask)
 * 3. Batching approval requests (approve multiple at once)
 * 4. Tracking approval sources (where are the bottlenecks?)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERMISSION_CONFIG = path.join(__dirname, "permission-config.json");
const APPROVAL_CACHE = path.join(__dirname, "approval-cache.json");

class PermissionManager {
  constructor() {
    this.config = this.loadConfig();
    this.cache = this.loadCache();
    this.pendingRequests = [];
  }

  /**
   * Load permission configuration
   */
  loadConfig() {
    try {
      if (fs.existsSync(PERMISSION_CONFIG)) {
        const loaded = JSON.parse(fs.readFileSync(PERMISSION_CONFIG, "utf-8"));
        // Flatten nested config structure if present
        return {
          version: loaded.version,
          lastUpdated: loaded.lastUpdated,
          whitelisted: loaded.whitelisted || [],
          blacklisted: loaded.blacklisted || [],
          requireApproval: loaded.config?.requireApproval ?? loaded.requireApproval ?? true,
          batchApprovals: loaded.config?.batchApprovals ?? loaded.batchApprovals ?? true,
          cacheApprovals: loaded.config?.cacheApprovals ?? loaded.cacheApprovals ?? true,
          cacheExpiry: loaded.config?.cacheExpiry ?? loaded.cacheExpiry ?? 3600000,
        };
      }
    } catch (e) {
      console.warn(`⚠ Failed to load permission config: ${e.message}`);
    }

    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      whitelisted: [],
      blacklisted: [],
      requireApproval: true,
      batchApprovals: true,
      cacheApprovals: true,
      cacheExpiry: 3600000, // 1 hour
    };
  }

  /**
   * Load approval cache
   */
  loadCache() {
    try {
      if (fs.existsSync(APPROVAL_CACHE)) {
        return JSON.parse(fs.readFileSync(APPROVAL_CACHE, "utf-8"));
      }
    } catch (e) {
      console.warn(`⚠ Failed to load approval cache: ${e.message}`);
    }

    return {
      version: "1.0.0",
      approvals: {},
      stats: {
        totalRequests: 0,
        autoApproved: 0,
        cachedApprovals: 0,
        manualApprovals: 0,
      },
    };
  }

  /**
   * Save permission config
   */
  saveConfig() {
    try {
      fs.writeFileSync(
        PERMISSION_CONFIG,
        JSON.stringify(this.config, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error(`✗ Failed to save config: ${e.message}`);
    }
  }

  /**
   * Save approval cache
   */
  saveCache() {
    try {
      fs.writeFileSync(
        APPROVAL_CACHE,
        JSON.stringify(this.cache, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error(`✗ Failed to save cache: ${e.message}`);
    }
  }

  /**
   * Check if operation requires approval
   * Returns: { requires: boolean, reason: string }
   */
  checkPermission(operation, tool, args = {}) {
    // Check whitelist
    if (this.isWhitelisted(tool)) {
      return {
        requires: false,
        reason: "whitelisted",
        autoApproved: true,
      };
    }

    // Check blacklist
    if (this.isBlacklisted(tool)) {
      return {
        requires: true,
        reason: "blacklisted",
        blocked: true,
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(operation, tool);
    if (this.isCached(cacheKey)) {
      return {
        requires: false,
        reason: "cached",
        cachedAt: this.cache.approvals[cacheKey].approvedAt,
      };
    }

    // Default: requires approval
    return {
      requires: true,
      reason: "default",
    };
  }

  /**
   * Generate cache key
   */
  getCacheKey(operation, tool) {
    return `${operation}:${tool}`;
  }

  /**
   * Check if tool is whitelisted
   */
  isWhitelisted(tool) {
    return this.config.whitelisted.some((t) =>
      typeof t === "string" ? t === tool : t.tool === tool
    );
  }

  /**
   * Check if tool is blacklisted
   */
  isBlacklisted(tool) {
    return this.config.blacklisted.some((t) =>
      typeof t === "string" ? t === tool : t.tool === tool
    );
  }

  /**
   * Check if approval is cached and valid
   */
  isCached(cacheKey) {
    if (!this.config.cacheApprovals) return false;

    const approval = this.cache.approvals[cacheKey];
    if (!approval) return false;

    const age = Date.now() - new Date(approval.approvedAt).getTime();
    if (age > this.config.cacheExpiry) {
      delete this.cache.approvals[cacheKey];
      return false;
    }

    return true;
  }

  /**
   * Record approval decision
   */
  recordApproval(operation, tool, approved = true, reason = "manual") {
    const cacheKey = this.getCacheKey(operation, tool);

    this.cache.approvals[cacheKey] = {
      operation,
      tool,
      approved,
      reason,
      approvedAt: new Date().toISOString(),
    };

    // Update stats
    this.cache.stats.totalRequests++;
    if (reason === "whitelisted") this.cache.stats.autoApproved++;
    if (reason === "cached") this.cache.stats.cachedApprovals++;
    if (reason === "manual") this.cache.stats.manualApprovals++;

    this.saveCache();
  }

  /**
   * Add tool to whitelist
   */
  whitelist(tool, reason = "") {
    if (!this.config.whitelisted.includes(tool)) {
      this.config.whitelisted.push({
        tool,
        addedAt: new Date().toISOString(),
        reason,
      });
      this.saveConfig();
    }
  }

  /**
   * Remove tool from whitelist
   */
  removeFromWhitelist(tool) {
    this.config.whitelisted = this.config.whitelisted.filter(
      (t) => (typeof t === "string" ? t : t.tool) !== tool
    );
    this.saveConfig();
  }

  /**
   * Get approval summary
   */
  getSummary() {
    return {
      config: {
        whitelistCount: this.config.whitelisted.length,
        blacklistCount: this.config.blacklisted.length,
        cacheEnabled: this.config.cacheApprovals,
        cacheExpiry: this.config.cacheExpiry,
      },
      stats: this.cache.stats,
      cacheSize: Object.keys(this.cache.approvals).length,
      autoApprovalRate: (
        ((this.cache.stats.autoApproved / Math.max(1, this.cache.stats.totalRequests)) *
          100).toFixed(1) + "%"
      ),
      cachedApprovalRate: (
        ((this.cache.stats.cachedApprovals / Math.max(1, this.cache.stats.totalRequests)) *
          100).toFixed(1) + "%"
      ),
    };
  }

  /**
   * Get recent approval requests
   */
  getRecentApprovals(limit = 20) {
    return Object.values(this.cache.approvals)
      .sort(
        (a, b) =>
          new Date(b.approvedAt) - new Date(a.approvedAt)
      )
      .slice(0, limit);
  }

  /**
   * Analyze approval bottlenecks
   */
  analyzeBottlenecks() {
    const approvals = Object.values(this.cache.approvals);
    const byTool = {};
    const byOperation = {};

    for (const approval of approvals) {
      byTool[approval.tool] = (byTool[approval.tool] || 0) + 1;
      byOperation[approval.operation] =
        (byOperation[approval.operation] || 0) + 1;
    }

    return {
      topTools: Object.entries(byTool)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tool, count]) => ({ tool, count })),
      topOperations: Object.entries(byOperation)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([operation, count]) => ({ operation, count })),
      recommendations: this.generateRecommendations(byTool),
    };
  }

  /**
   * Generate whitelist recommendations
   */
  generateRecommendations(byTool) {
    const recommendations = [];

    for (const [tool, count] of Object.entries(byTool)) {
      if (count >= 5) {
        recommendations.push({
          tool,
          count,
          recommendation: `Whitelist ${tool} (requested ${count}+ times)`,
          priority: count >= 20 ? "high" : "medium",
        });
      }
    }

    return recommendations.sort((a, b) => b.count - a.count);
  }

  /**
   * Clear cache (for testing or reset)
   */
  clearCache() {
    this.cache.approvals = {};
    this.cache.stats = {
      totalRequests: 0,
      autoApproved: 0,
      cachedApprovals: 0,
      manualApprovals: 0,
    };
    this.saveCache();
  }

  /**
   * Auto-decide an approval in autonomous mode
   * Returns: { approved: boolean, reason: string, autonomousDecision: true }
   */
  autoDecideAutonomous(operation, tool, args = {}) {
    // Check whitelist - whitelisted tools are auto-approved
    if (this.isWhitelisted(tool)) {
      return {
        approved: true,
        reason: "whitelisted",
        autonomousDecision: true,
      };
    }

    // Check cache - cached approvals are auto-approved
    const cacheKey = this.getCacheKey(operation, tool);
    if (this.isCached(cacheKey)) {
      return {
        approved: true,
        reason: "cached",
        autonomousDecision: true,
      };
    }

    // Unknown/non-whitelisted operations require approval (will be blocked)
    return {
      approved: false,
      reason: "unknown-operation",
      autonomousDecision: true,
    };
  }
}

/**
 * Demo/test the permission manager
 */
async function demo() {
  console.log("\n🔐 PERMISSION MANAGEMENT SYSTEM\n");

  const manager = new PermissionManager();

  // Simulate permission checks
  console.log("Simulating permission checks:\n");

  // Pre-approved tools
  manager.whitelist("helm:ideas-summary", "Safe aggregation query");
  manager.whitelist("helm:pri-search", "Read-only search");
  manager.whitelist("git:status", "Safe read operation");

  const testCases = [
    { operation: "list", tool: "helm:ideas-summary" },
    { operation: "search", tool: "helm:pri-search" },
    { operation: "query", tool: "helm:ideas-summary" },
    { operation: "run", tool: "npm:build" },
    { operation: "commit", tool: "git:push" },
  ];

  for (const { operation, tool } of testCases) {
    const result = manager.checkPermission(operation, tool);
    console.log(
      `  ${result.autoApproved ? "✅" : result.requires ? "⏳" : "✔️"} ${operation} / ${tool}`
    );
    console.log(`     → ${result.reason}`);
    manager.recordApproval(operation, tool, !result.requires, result.reason);
  }

  // Show summary
  console.log("\n📊 PERMISSION SUMMARY:\n");
  const summary = manager.getSummary();
  console.log(`  Whitelist: ${summary.config.whitelistCount} tools`);
  console.log(`  Cache: ${summary.cacheSize} cached decisions`);
  console.log(`  Auto-Approval Rate: ${summary.autoApprovalRate}`);
  console.log(`  Cached Rate: ${summary.cachedApprovalRate}`);

  // Show bottlenecks
  console.log("\n🔴 BOTTLENECK ANALYSIS:\n");
  const analysis = manager.analyzeBottlenecks();
  console.log("  Top Tools:");
  for (const { tool, count } of analysis.topTools) {
    console.log(`    - ${tool}: ${count} requests`);
  }

  console.log("\n  Recommendations:");
  for (const rec of analysis.recommendations) {
    console.log(
      `    [${rec.priority.toUpperCase()}] ${rec.recommendation}`
    );
  }

  console.log("\n✅ Config saved to:", PERMISSION_CONFIG);
  console.log("✅ Cache saved to:", APPROVAL_CACHE);
  console.log();
}

export { PermissionManager };

if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}
