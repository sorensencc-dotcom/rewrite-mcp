#!/usr/bin/env node

/**
 * Automatic Whitelist Manager
 *
 * Automatically whitelists approved commands to reduce manual overhead.
 * Rules:
 * - Auto-promoted items are already whitelisted
 * - Manually-approved items with 2+ occurrences are auto-whitelisted
 * - New patterns are flagged for review
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ApprovalHandler } from "./approval-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "approvals-manifest.json");

class AutoWhitelistManager {
  constructor() {
    this.handler = new ApprovalHandler();
    this.manifest = this.handler.manifest;
    this.changes = [];
  }

  /**
   * Identify commands ready for auto-whitelist
   */
  identifyWhitelistCandidates() {
    const candidates = [];

    // Find manually-approved items with 2+ occurrences
    const manuallyApproved = this.manifest.preApproved.filter(
      (item) => item.status === "manually-approved" && item.occurrences >= 2
    );

    manuallyApproved.forEach((item) => {
      candidates.push({
        command: item.command,
        reason: item.reason,
        status: item.status,
        occurrences: item.occurrences,
        action: "already-whitelisted",
        priority: "low",
      });
    });

    return candidates;
  }

  /**
   * Automatically whitelist stable patterns
   */
  autoWhitelistStablePatterns() {
    const candidates = this.identifyWhitelistCandidates();

    candidates.forEach((candidate) => {
      const item = this.manifest.preApproved.find(
        (p) => p.command === candidate.command
      );
      if (item && item.status === "manually-approved") {
        item.whiteListed = true;
        item.whiteListedAt = new Date().toISOString();
        this.changes.push({
          command: candidate.command,
          action: "auto-whitelisted",
          reason: `Stable pattern (${item.occurrences} occurrences)`,
        });
      }
    });

    return this.changes;
  }

  /**
   * Get whitelisting summary
   */
  getWhitelistSummary() {
    const whiteListed = this.manifest.preApproved.filter(
      (item) => item.whiteListed
    ).length;
    const autoPromoted = this.manifest.preApproved.filter(
      (item) => item.status === "auto-promoted"
    ).length;
    const manuallyApproved = this.manifest.preApproved.filter(
      (item) => item.status === "manually-approved"
    ).length;

    return {
      totalApproved: this.manifest.preApproved.length,
      whiteListed,
      autoPromoted,
      manuallyApproved,
      changes: this.changes,
      coverage: {
        whitelistedOrAutoPromoted:
          ((whiteListed + autoPromoted) /
            this.manifest.preApproved.length) *
          100,
        manualApprovalNeeded:
          (manuallyApproved / this.manifest.preApproved.length) * 100,
      },
    };
  }

  /**
   * Save changes to manifest
   */
  saveChanges() {
    try {
      fs.writeFileSync(
        MANIFEST_PATH,
        JSON.stringify(this.manifest, null, 2),
        "utf-8"
      );
      return true;
    } catch (e) {
      console.error(`Error saving manifest: ${e.message}`);
      return false;
    }
  }
}

// Export for module use
export { AutoWhitelistManager };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new AutoWhitelistManager();

  console.log("\n🔐 AUTO-WHITELIST MANAGER\n");
  console.log("=" + "=".repeat(60));

  // Identify candidates
  const candidates = manager.identifyWhitelistCandidates();
  if (candidates.length > 0) {
    console.log("\nCandidates for auto-whitelist:");
    candidates.forEach((c) => {
      console.log(`  • ${c.command}`);
      console.log(`    Occurrences: ${c.occurrences}`);
    });
  }

  // Apply auto-whitelist
  console.log("\nApplying auto-whitelist...");
  manager.autoWhitelistStablePatterns();

  // Show summary
  const summary = manager.getWhitelistSummary();
  console.log("\nWHITELIST SUMMARY:");
  console.log(`  Total Approved: ${summary.totalApproved}`);
  console.log(`  Auto-Promoted: ${summary.autoPromoted}`);
  console.log(`  Manually Approved: ${summary.manuallyApproved}`);
  console.log(`  Auto-Whitelisted: ${summary.whiteListed}`);
  console.log(
    `  Coverage: ${(summary.coverage.whitelistedOrAutoPromoted || 0).toFixed(1)}% automated`
  );

  if (summary.changes.length > 0) {
    console.log("\nCHANGES MADE:");
    summary.changes.forEach((change) => {
      console.log(`  ✓ ${change.command}`);
      console.log(`    → ${change.action}: ${change.reason}`);
    });

    // Save changes
    manager.saveChanges();
    console.log("\n✅ Changes saved to manifest");
  } else {
    console.log("\n✓ No changes needed - all patterns are optimized");
  }

  console.log("\n" + "=".repeat(60) + "\n");
}
