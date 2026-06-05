#!/usr/bin/env node

/**
 * Proactive Approval Handler
 *
 * Tracks approval requests and automatically promotes items to pre-approved list
 * when they reach the threshold of 2 occurrences (configurable).
 *
 * Features:
 * - Proactive tracking of all build/command requests
 * - Auto-promotion at threshold (default: 2 occurrences)
 * - Maintains approval manifest with frequency data
 * - Reports on auto-promoted items and trends
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "approvals-manifest.json");

class ApprovalHandler {
  constructor() {
    this.manifest = this.loadManifest();
    this.threshold = this.manifest.config.autoPromoteThreshold;
  }

  /**
   * Load approval manifest from disk
   */
  loadManifest() {
    try {
      if (fs.existsSync(MANIFEST_PATH)) {
        const data = fs.readFileSync(MANIFEST_PATH, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn(`⚠ Failed to load manifest: ${e.message}`);
    }

    // Return default manifest if file doesn't exist
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      description:
        "Proactive approval manifest with threshold-based auto-promotion",
      config: {
        autoPromoteThreshold: 2,
        trackingEnabled: true,
      },
      preApproved: [],
      pending: [],
      tracking: {
        totalRequests: 0,
        autoPromoted: 0,
        manuallyApproved: 0,
        rejected: 0,
        autoPromotionRate: "0%",
      },
    };
  }

  /**
   * Save manifest to disk
   */
  saveManifest() {
    try {
      fs.writeFileSync(
        MANIFEST_PATH,
        JSON.stringify(this.manifest, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.error(`✗ Failed to save manifest: ${e.message}`);
    }
  }

  /**
   * Find a command in manifest (preApproved or pending)
   */
  findCommand(command, context = null) {
    const match = (item) =>
      item.command === command && (!context || item.context === context);

    const inPreApproved = this.manifest.preApproved.find(match);
    if (inPreApproved) return { item: inPreApproved, list: "preApproved" };

    const inPending = this.manifest.pending.find(match);
    if (inPending) return { item: inPending, list: "pending" };

    return null;
  }

  /**
   * Track approval request and auto-promote if threshold is met
   *
   * @param {string} command - The command being requested
   * @param {string} reason - Why the command is being requested
   * @param {string} context - Optional context (e.g., "projects/cic/ingestion")
   * @returns {Object} Result with approval status and auto-promotion decision
   */
  trackApproval(command, reason = "", context = null) {
    const found = this.findCommand(command, context);

    // Already pre-approved
    if (found?.list === "preApproved") {
      found.item.occurrences++;
      this.manifest.tracking.totalRequests++;
      this.saveManifest();
      return {
        status: "auto-approved",
        reason: "Already in pre-approved list",
        command,
        occurrences: found.item.occurrences,
      };
    }

    // Pending approval - increment count
    if (found?.list === "pending") {
      found.item.occurrences++;

      // Check if threshold reached
      if (found.item.occurrences >= this.threshold) {
        return this.promoteToPreApproved(found.item, command, context);
      }

      this.manifest.tracking.totalRequests++;
      this.saveManifest();
      return {
        status: "pending",
        reason: "Under review",
        command,
        occurrences: found.item.occurrences,
        remainingForApproval: this.threshold - found.item.occurrences,
      };
    }

    // New command - add to pending
    const newItem = {
      command,
      reason,
      status: "pending",
      occurrences: 1,
      firstSeen: new Date().toISOString(),
      ...(context && { context }),
    };

    this.manifest.pending.push(newItem);
    this.manifest.tracking.totalRequests++;
    this.saveManifest();

    return {
      status: "pending",
      reason: "New command, awaiting second occurrence for auto-promotion",
      command,
      occurrences: 1,
      remainingForApproval: this.threshold - 1,
    };
  }

  /**
   * Manually approve a command (skip threshold)
   */
  approveCommand(command, reason = "", context = null) {
    const found = this.findCommand(command, context);

    if (found?.list === "preApproved") {
      return {
        status: "already-approved",
        message: `${command} is already pre-approved`,
      };
    }

    // Move from pending to preApproved
    if (found?.list === "pending") {
      const item = found.item;
      item.status = "manually-approved";
      item.approvedAt = new Date().toISOString();

      // Remove from pending and add to preApproved
      const index = this.manifest.pending.indexOf(item);
      if (index > -1) {
        this.manifest.pending.splice(index, 1);
      }

      this.manifest.preApproved.push(item);
      this.manifest.tracking.manuallyApproved++;
      this.saveManifest();

      return {
        status: "approved",
        command,
        movedFrom: "pending",
        approvalType: "manual",
      };
    }

    // New command approved directly
    const newItem = {
      command,
      reason,
      status: "manually-approved",
      occurrences: 1,
      firstSeen: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      ...(context && { context }),
    };

    this.manifest.preApproved.push(newItem);
    this.manifest.tracking.manuallyApproved++;
    this.manifest.tracking.totalRequests++;
    this.saveManifest();

    return {
      status: "approved",
      command,
      approvalType: "manual",
    };
  }

  /**
   * Promote a command to pre-approved list (internal)
   */
  promoteToPreApproved(item, command, context) {
    // Remove from pending
    const index = this.manifest.pending.indexOf(item);
    if (index > -1) {
      this.manifest.pending.splice(index, 1);
    }

    // Update item and add to preApproved
    item.status = "auto-promoted";
    item.autoPromotedAt = new Date().toISOString();

    this.manifest.preApproved.push(item);
    this.manifest.tracking.autoPromoted++;
    this.manifest.tracking.totalRequests++;

    // Update auto-promotion rate
    const total = this.manifest.tracking.totalRequests;
    const promoted = this.manifest.tracking.autoPromoted;
    this.manifest.tracking.autoPromotionRate = (
      ((promoted / total) * 100).toFixed(1) + "%"
    );

    this.saveManifest();

    return {
      status: "auto-promoted",
      reason: `Threshold of ${this.threshold} occurrences reached`,
      command,
      occurrences: item.occurrences,
      autoPromotedAt: item.autoPromotedAt,
    };
  }

  /**
   * Get approval summary/report
   */
  getSummary() {
    const preApprovedCount = this.manifest.preApproved.length;
    const pendingCount = this.manifest.pending.length;
    const autoPromotion =
      this.manifest.tracking.autoPromoted /
      Math.max(1, this.manifest.tracking.totalRequests);

    return {
      config: this.manifest.config,
      stats: {
        preApprovedCount,
        pendingCount,
        totalRequests: this.manifest.tracking.totalRequests,
        autoPromoted: this.manifest.tracking.autoPromoted,
        manuallyApproved: this.manifest.tracking.manuallyApproved,
        autoPromotionRate: this.manifest.tracking.autoPromotionRate,
      },
      recentAutoPromotions: this.manifest.preApproved
        .filter((item) => item.status === "auto-promoted")
        .sort(
          (a, b) =>
            new Date(b.autoPromotedAt) - new Date(a.autoPromotedAt)
        )
        .slice(0, 5),
      pendingReview: this.manifest.pending
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5),
    };
  }

  /**
   * Get list of pre-approved commands
   */
  getPreApproved() {
    return this.manifest.preApproved.map((item) => ({
      command: item.command,
      reason: item.reason,
      status: item.status,
      occurrences: item.occurrences,
    }));
  }

  /**
   * Get list of pending commands
   */
  getPending() {
    return this.manifest.pending.map((item) => ({
      command: item.command,
      reason: item.reason,
      occurrences: item.occurrences,
      remainingForApproval: Math.max(0, this.threshold - item.occurrences),
    }));
  }
}

/**
 * Test/demo the approval handler
 */
async function demo() {
  console.log("\n🔐 APPROVAL HANDLER — PROACTIVE AUTO-PROMOTION\n");

  const handler = new ApprovalHandler();

  // Simulate tracking requests
  console.log("📊 Tracking approval requests:\n");

  const testCommands = [
    {
      cmd: "npm run build-docs",
      reason: "Build documentation",
    },
    {
      cmd: "npm run build-docs",
      reason: "Build documentation (2nd time)",
    },
    {
      cmd: "npm test",
      reason: "Run tests",
    },
    {
      cmd: "npm test",
      reason: "Run tests (2nd time)",
    },
    {
      cmd: "npm deploy",
      reason: "Deploy to production",
    },
  ];

  for (const { cmd, reason } of testCommands) {
    const result = handler.trackApproval(cmd, reason);
    console.log(
      `  ${result.status === "auto-promoted" ? "✅" : result.status === "auto-approved" ? "✔️" : "⏳"} ${cmd}`
    );
    console.log(`     → ${result.reason} (${result.occurrences} occurrence)`);
    if (result.remainingForApproval) {
      console.log(
        `     → ${result.remainingForApproval} more needed for auto-approval`
      );
    }
    console.log();
  }

  // Show summary
  console.log("\n📈 APPROVAL SUMMARY:\n");
  const summary = handler.getSummary();
  console.log(`  Pre-Approved: ${summary.stats.preApprovedCount}`);
  console.log(`  Pending Review: ${summary.stats.pendingCount}`);
  console.log(`  Total Requests: ${summary.stats.totalRequests}`);
  console.log(`  Auto-Promoted: ${summary.stats.autoPromoted}`);
  console.log(`  Auto-Promotion Rate: ${summary.stats.autoPromotionRate}`);

  if (summary.recentAutoPromotions.length > 0) {
    console.log("\n  📌 Recently Auto-Promoted:");
    for (const item of summary.recentAutoPromotions) {
      console.log(`     - ${item.command} (${item.occurrences} occurrences)`);
    }
  }

  if (summary.pendingReview.length > 0) {
    console.log("\n  ⏳ Pending Review:");
    for (const item of summary.pendingReview) {
      console.log(
        `     - ${item.command} (${item.occurrences}/${handler.threshold})`
      );
    }
  }

  console.log("\n✅ Manifest saved to:", MANIFEST_PATH);
  console.log();
}

// Export for module use
export { ApprovalHandler };

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}
