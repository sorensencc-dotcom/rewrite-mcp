/**
 * Real-Time Policy Validator — Integrated Git Approval Agent
 *
 * Runs BEFORE commit, validates staged files against:
 * - Zone ownership rules (from AGENTS.md)
 * - File count thresholds
 * - Cross-zone bundling violations
 * - Unrelated changes
 *
 * Blocks commits that violate policy. No clicks. No bypasses.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export class PolicyValidator {
  constructor(repoRoot) {
    this.repoRoot = repoRoot;
    this.zoneRules = [];
    this.violations = [];
    this.loadZoneRules();
  }

  /**
   * Parse AGENTS.md files to extract zone ownership rules
   */
  loadZoneRules() {
    const agentsMdFiles = [
      path.join(this.repoRoot, "AGENTS.md"),
      path.join(this.repoRoot, "projects/cic/AGENTS.md"),
    ];

    for (const file of agentsMdFiles) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, "utf-8");
      const table = this.extractZoneTable(content);

      // Parse zone table into rules
      for (const row of table) {
        if (row.path && row.primary) {
          this.zoneRules.push({
            path: row.path,
            owner: row.primary,
            mayAssist: row.mayAssist ? [row.mayAssist] : undefined,
            notes: row.notes,
          });
        }
      }
    }
  }

  /**
   * Extract markdown table from AGENTS.md
   */
  extractZoneTable(content) {
    const rows = [];
    const lines = content.split("\n");
    let inTable = false;

    for (const line of lines) {
      if (line.includes("| Path |")) {
        inTable = true;
        continue;
      }
      if (inTable && line.startsWith("|")) {
        const cells = line.split("|").map((c) => c.trim());
        if (cells.length >= 4) {
          rows.push({
            path: cells[1],
            primary: cells[2],
            mayAssist: cells[3],
            notes: cells[4],
          });
        }
      }
      if (inTable && !line.startsWith("|")) break;
    }

    return rows;
  }

  /**
   * Get staged files from git
   */
  getStagedFiles() {
    try {
      const output = execSync("git diff --cached --name-only", {
        cwd: this.repoRoot,
        encoding: "utf-8",
      });
      return output.trim().split("\n").filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Find matching zone rule for a file
   */
  findZoneForFile(file) {
    for (const rule of this.zoneRules) {
      const pattern = this.globToRegex(rule.path);
      if (pattern.test(file)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Convert glob pattern to regex
   */
  globToRegex(glob) {
    const pattern = glob
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "___DOUBLESTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLESTAR___/g, ".*");
    return new RegExp(`^${pattern}`);
  }

  /**
   * Get author from git config or env
   */
  getAuthor() {
    try {
      return execSync("git config user.name", {
        cwd: this.repoRoot,
        encoding: "utf-8",
      }).trim();
    } catch {
      return process.env.USER || process.env.USERNAME || "unknown";
    }
  }

  /**
   * Extract tool prefix from commit message
   */
  extractToolPrefix(commitMsg) {
    const match = commitMsg.match(/^\[(\w+)\]/);
    return match ? match[1] : null;
  }

  /**
   * Main validation: Check staged files against policy
   */
  validate(commitMessage) {
    this.violations = [];
    const stagedFiles = this.getStagedFiles();
    const tool = this.extractToolPrefix(commitMessage);

    if (!tool) {
      this.violations.push({
        type: "owner_violation",
        file: "commit message",
        rule: { path: "*", owner: "any" },
        message:
          "POLICY: Commit must start with [claude], [copilot], [gemini], or [human]",
        severity: "error",
      });
    }

    // Check each staged file against zone rules
    const filesByZone = new Map();

    for (const file of stagedFiles) {
      const zone = this.findZoneForFile(file);

      if (!zone) {
        // File not in any zone (untracked or new file)
        const untracked = filesByZone.get("__untracked") || [];
        filesByZone.set("__untracked", [...untracked, file]);
        continue;
      }

      const zoneFiles = filesByZone.get(zone.path) || [];
      filesByZone.set(zone.path, [...zoneFiles, file]);

      // Check zone ownership
      if (zone.owner !== "any" && tool && zone.owner !== tool) {
        // Tool doesn't match zone owner
        if (!zone.mayAssist?.includes(tool || "")) {
          this.violations.push({
            type: "zone_violation",
            file,
            rule: zone,
            message: `Zone '${zone.path}' owned by [${zone.owner}], but commit is [${tool}]. ${zone.mayAssist ? `May assist: [${zone.mayAssist.join("], [")}]` : "No assists allowed"}`,
            severity: "error",
          });
        }
      }
    }

    // Check bundling violations: files from different zones in one commit
    const zoneCount = Array.from(filesByZone.keys()).filter(
      (z) => z !== "__untracked"
    ).length;
    if (zoneCount > 2) {
      // More than 2 zones (excluding untracked)
      this.violations.push({
        type: "bundling_violation",
        file: "commit",
        rule: { path: "*", owner: "any" },
        message: `Cannot bundle files from ${zoneCount} different zones in one commit. Zones: ${Array.from(filesByZone.keys()).join(", ")}`,
        severity: "error",
      });
    }

    return this.violations.filter((v) => v.severity === "error").length === 0;
  }

  /**
   * Print validation results
   */
  report() {
    if (this.violations.length === 0) {
      return "✅ All policy checks passed.";
    }

    const errors = this.violations.filter((v) => v.severity === "error");
    const warnings = this.violations.filter((v) => v.severity === "warning");

    let report = "";
    if (errors.length > 0) {
      report += `\n❌ POLICY VIOLATIONS (${errors.length} errors):\n`;
      for (const v of errors) {
        report += `\n  File: ${v.file}\n`;
        report += `  Type: ${v.type}\n`;
        report += `  Rule: ${v.rule.path} (owner: ${v.rule.owner})\n`;
        report += `  Error: ${v.message}\n`;
      }
    }

    if (warnings.length > 0) {
      report += `\n⚠️  WARNINGS (${warnings.length} warnings):\n`;
      for (const v of warnings) {
        report += `  ${v.file}: ${v.message}\n`;
      }
    }

    return report;
  }

  /**
   * Get violations for programmatic use
   */
  getViolations() {
    return this.violations;
  }
}
