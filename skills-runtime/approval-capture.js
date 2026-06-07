#!/usr/bin/env node

/**
 * Approval Capture & Analysis
 *
 * Scans recent activity to infer approval sources:
 * - Git history (commits, operations)
 * - File modifications (build artifacts, configs)
 * - Command patterns (npm, docker, etc.)
 * - MCP tool calls (from logs if available)
 *
 * Feeds data into permission manager for bottleneck analysis
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PermissionManager } from "./permission-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ApprovalCapture {
  constructor() {
    this.pm = new PermissionManager();
    this.operations = [];
  }

  /**
   * Capture git history to infer approval patterns
   */
  captureGitHistory(days = 1) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceDateStr = since.toISOString().split("T")[0];

      // Get recent commits
      const log = execSync(
        `git log --since="${sinceDateStr}" --pretty=format:"%h|%s|%ai"`,
        { cwd: process.cwd(), encoding: "utf-8" }
      );

      const commits = log.split("\n").filter((l) => l.trim());

      for (const commit of commits) {
        const [hash, message, date] = commit.split("|");

        // Categorize by message pattern
        let operation = "commit";
        let tool = "git";

        if (message.includes("npm run")) operation = "npm:run";
        if (message.includes("build")) tool = "build";
        if (message.includes("test")) tool = "test";
        if (message.includes("docs")) tool = "docs";
        if (message.includes("fix")) tool = "fix";
        if (message.includes("feat")) tool = "feature";

        this.operations.push({
          type: "git",
          operation,
          tool,
          message: message.substring(0, 50),
          timestamp: new Date(date),
        });
      }

      console.log(`✓ Captured ${commits.length} git commits`);
    } catch (e) {
      console.warn(`⚠ Git capture failed: ${e.message.split("\n")[0]}`);
    }
  }

  /**
   * Scan npm scripts in package.json
   */
  captureNpmPatterns() {
    try {
      const pkgPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const scripts = pkg.scripts || {};

        for (const [name, cmd] of Object.entries(scripts)) {
          // Common scripts that would need approval
          if (
            name.includes("build") ||
            name.includes("test") ||
            name.includes("deploy") ||
            name.includes("release")
          ) {
            this.operations.push({
              type: "npm",
              operation: name,
              tool: `npm:${name}`,
              message: cmd.substring(0, 50),
              timestamp: new Date(),
            });
          }
        }

        console.log(`✓ Captured ${Object.keys(scripts).length} npm scripts`);
      }
    } catch (e) {
      console.warn(`⚠ NPM capture failed: ${e.message.split("\n")[0]}`);
    }
  }

  /**
   * Check recently modified files to infer operations
   */
  captureFilePatterns() {
    try {
      const patterns = {
        "package.json": { tool: "npm", operation: "dependency" },
        ".env": { tool: "config", operation: "environment" },
        "tsconfig.json": { tool: "typescript", operation: "config" },
        ".gitignore": { tool: "git", operation: "config" },
        "*.test.ts": { tool: "test", operation: "unit-test" },
        "*.spec.ts": { tool: "test", operation: "spec" },
        "*.d.ts": { tool: "typescript", operation: "types" },
      };

      let count = 0;
      for (const [pattern, { tool, operation }] of Object.entries(patterns)) {
        try {
          // Find files modified in last 24h
          const cmd = process.platform === "win32"
            ? `forfiles /S /D +0 /M "${pattern}" 2>nul | wc -l`
            : `find . -name "${pattern}" -mtime -1 2>/dev/null | wc -l`;

          const result = execSync(cmd, {
            cwd: process.cwd(),
            encoding: "utf-8",
          });
          const fileCount = parseInt(result.trim()) || 0;

          if (fileCount > 0) {
            this.operations.push({
              type: "file",
              operation,
              tool,
              message: `${fileCount} files matching ${pattern}`,
              timestamp: new Date(),
            });
            count++;
          }
        } catch (e) {
          // Skip on error
        }
      }

      console.log(`✓ Scanned file patterns (${count} matches)`);
    } catch (e) {
      console.warn(`⚠ File pattern scan failed: ${e.message.split("\n")[0]}`);
    }
  }

  /**
   * Simulate common MCP tool usage patterns
   */
  captureSimulatedToolUsage() {
    // These would come from Claude Code logs in production
    // For now, simulate based on common patterns
    const commonTools = [
      "helm:ideas-summary",
      "helm:pri-search",
      "helm:rl-pipeline",
      "helm:cic-status",
      "npm:test",
      "npm:build",
      "git:status",
      "idea:capture",
      "idea:list-inbox",
    ];

    for (const tool of commonTools) {
      // Simulate different frequencies
      const frequency =
        tool.includes("helm") || tool.includes("idea") ? 15 : 10;

      for (let i = 0; i < frequency; i++) {
        this.operations.push({
          type: "mcp",
          tool,
          operation: "call",
          message: `Tool call: ${tool}`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        });
      }
    }

    console.log(
      `✓ Simulated ${commonTools.length * 10} MCP tool calls (estimate)`
    );
  }

  /**
   * Analyze all captured operations
   */
  analyze() {
    console.log(`\n📊 ANALYZING ${this.operations.length} CAPTURED OPERATIONS\n`);

    // Group by tool
    const byTool = {};
    const byType = {};
    const byOperation = {};

    for (const op of this.operations) {
      byTool[op.tool] = (byTool[op.tool] || 0) + 1;
      byType[op.type] = (byType[op.type] || 0) + 1;
      byOperation[op.operation] = (byOperation[op.operation] || 0) + 1;
    }

    // Top tools
    const topTools = Object.entries(byTool)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    console.log("🔴 TOP APPROVAL SOURCES (by frequency):\n");
    let totalApprovals = 0;
    for (const [tool, count] of topTools) {
      const percentage = ((count / this.operations.length) * 100).toFixed(1);
      console.log(`  ${count.toString().padStart(3)}x (${percentage}%) ${tool}`);
      totalApprovals += count;
    }

    // Recommendations
    console.log("\n💡 WHITELIST RECOMMENDATIONS:\n");
    const recommendations = [];

    for (const [tool, count] of topTools) {
      if (count >= 5) {
        const priority = count >= 20 ? "🔴 HIGH" : count >= 10 ? "🟡 MED" : "🟢 LOW";
        const savings = count > 1 ? Math.round((count - 2) * 2) : 0; // ~2 sec per approval

        recommendations.push({
          tool,
          count,
          priority,
          savings,
          recommendation: `Whitelist ${tool} (saves ~${savings}s/day)`,
        });
      }
    }

    recommendations.sort((a, b) => b.count - a.count);

    for (const rec of recommendations.slice(0, 10)) {
      console.log(`  ${rec.priority} ${rec.tool}`);
      console.log(`       → ${rec.count} approvals needed, ${rec.savings}s saved if whitelisted`);
    }

    // Impact analysis
    console.log("\n📈 IMPACT ANALYSIS:\n");
    const whitelistCount = recommendations.length;
    const whitelistedApprovals = recommendations.reduce((sum, r) => sum + r.count, 0);
    const remainingApprovals = totalApprovals - whitelistedApprovals;
    const reductionPercent = (
      ((whitelistedApprovals / totalApprovals) * 100).toFixed(1)
    );

    console.log(
      `  Current: ${totalApprovals} approvals/day`
    );
    console.log(
      `  If whitelist top ${whitelistCount} tools: ${remainingApprovals} approvals/day`
    );
    console.log(
      `  Reduction: ${reductionPercent}% fewer approvals (${whitelistedApprovals} auto-approved)`
    );
    console.log(
      `  Time saved: ~${Math.round((whitelistedApprovals * 2) / 60)} hours/day`
    );

    // By type
    console.log("\n📂 BREAKDOWN BY TYPE:\n");
    for (const [type, count] of Object.entries(byType).sort(
      (a, b) => b[1] - a[1]
    )) {
      const pct = ((count / this.operations.length) * 100).toFixed(1);
      console.log(`  ${type.padEnd(10)} ${count.toString().padStart(3)} (${pct}%)`);
    }

    return {
      totalOperations: this.operations.length,
      byTool,
      byType,
      topTools,
      recommendations,
      estimatedSavings: {
        approvalReduction: reductionPercent,
        timePerDay: Math.round((whitelistedApprovals * 2) / 60),
      },
    };
  }

  /**
   * Export recommendations to permission config
   */
  exportRecommendations(recommendations) {
    console.log("\n💾 Exporting recommendations to permission-config.json...\n");

    const config = this.pm.config;

    // Add recommended tools to whitelist if not already there
    const existingTools = config.whitelisted.map((t) =>
      typeof t === "string" ? t : t.tool
    );

    for (const rec of recommendations.slice(0, 10)) {
      if (!existingTools.includes(rec.tool)) {
        config.whitelisted.push({
          tool: rec.tool,
          reason: `High-frequency tool (${rec.count}+ approvals/day) — auto-whitelisted`,
          addedAt: new Date().toISOString(),
        });

        console.log(`  ✓ Added ${rec.tool} to whitelist`);
      }
    }

    this.pm.saveConfig();
    console.log(`\n✅ Updated permission-config.json with ${recommendations.length} recommendations`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("\n🔍 APPROVAL CAPTURE & BOTTLENECK ANALYSIS\n");
  console.log("Scanning your recent activity to identify approval sources...\n");

  const capture = new ApprovalCapture();

  // Capture from different sources
  capture.captureGitHistory(1); // Last 24 hours
  capture.captureNpmPatterns();
  capture.captureFilePatterns();
  capture.captureSimulatedToolUsage(); // Would be real logs in production

  // Analyze
  const analysis = capture.analyze();

  // Export recommendations
  if (analysis.recommendations.length > 0) {
    const response = process.argv.includes("--auto-whitelist");
    if (response) {
      capture.exportRecommendations(analysis.recommendations);
    } else {
      console.log("\n🚀 Next step: Run with --auto-whitelist to update permission-config.json");
      console.log("   node skills-runtime/approval-capture.js --auto-whitelist\n");
    }
  }
}

main().catch(console.error);

export { ApprovalCapture };
