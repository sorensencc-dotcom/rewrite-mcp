#!/usr/bin/env node

/**
 * Approvals Weekly Report Generator
 *
 * Analyzes approval patterns over the past week to:
 * - Identify automation opportunities
 * - Track approval trends
 * - Highlight gaps in approval coverage
 * - Suggest improvements
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(__dirname, "approvals-manifest.json");

class ApprovalsWeeklyReport {
  constructor() {
    this.manifest = this.loadManifest();
    this.weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }

  loadManifest() {
    try {
      if (fs.existsSync(MANIFEST_PATH)) {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
      }
    } catch (e) {
      console.warn(`Warning: Failed to load manifest: ${e.message}`);
    }
    return { preApproved: [], pending: [], tracking: {} };
  }

  /**
   * Get items approved in the past week
   */
  getRecentApprovals() {
    return this.manifest.preApproved.filter((item) => {
      const timestamp = item.autoPromotedAt || item.approvedAt || item.firstSeen;
      return new Date(timestamp) > this.weekAgo;
    });
  }

  /**
   * Calculate approval metrics
   */
  calculateMetrics() {
    const recentApprovals = this.getRecentApprovals();
    const autoPromoted = recentApprovals.filter(
      (item) => item.status === "auto-promoted"
    ).length;
    const manuallyApproved = recentApprovals.filter(
      (item) => item.status === "manually-approved"
    ).length;

    return {
      totalApprovedThisWeek: recentApprovals.length,
      autoPromoted,
      manuallyApproved,
      automationRate:
        recentApprovals.length > 0
          ? ((autoPromoted / recentApprovals.length) * 100).toFixed(1) + "%"
          : "0%",
    };
  }

  /**
   * Identify high-frequency commands (automation candidates)
   */
  identifyAutomationCandidates() {
    const preApproved = this.manifest.preApproved || [];
    return preApproved
      .filter((item) => item.occurrences >= 3)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map((item) => ({
        command: item.command,
        occurrences: item.occurrences,
        status: item.status,
        recommendation:
          item.status === "manually-approved"
            ? "Candidate for threshold-based auto-promotion"
            : "Already optimized",
      }));
  }

  /**
   * Identify approval coverage gaps
   */
  identifyGaps() {
    const pending = this.manifest.pending || [];
    const pendingCount = pending.length;
    const preApprovedCount = this.manifest.preApproved?.length || 0;

    const gaps = [];

    if (pendingCount > 5) {
      gaps.push({
        type: "pending-backlog",
        severity: "medium",
        description: `${pendingCount} items pending approval (threshold: 5)`,
        recommendation:
          "Review and approve pending items to reduce backlog",
      });
    }

    if (pendingCount === 0 && preApprovedCount > 0) {
      gaps.push({
        type: "coverage-complete",
        severity: "low",
        description: "All commands are either approved or auto-promoted",
        recommendation: "Continue monitoring for new patterns",
      });
    }

    return gaps;
  }

  /**
   * Generate weekly insights
   */
  generateInsights() {
    const metrics = this.calculateMetrics();
    const candidates = this.identifyAutomationCandidates();
    const gaps = this.identifyGaps();

    const insights = [];

    // Insight 1: Automation rate
    if (parseFloat(metrics.automationRate) > 60) {
      insights.push({
        type: "automation-high",
        title: "High Automation Rate",
        description: `${metrics.automationRate} of approvals this week were automatic`,
        action: "Continue using threshold-based auto-promotion",
      });
    }

    // Insight 2: Manual approval patterns
    if (metrics.manuallyApproved > 5) {
      insights.push({
        type: "manual-review-needed",
        title: "Manual Approvals Increasing",
        description: `${metrics.manuallyApproved} manual approvals this week`,
        action: "Review candidates for auto-promotion threshold",
      });
    }

    // Insight 3: High-frequency commands
    if (candidates.length > 0) {
      insights.push({
        type: "automation-opportunity",
        title: "Automation Opportunities",
        description: `${candidates.length} commands with 3+ occurrences`,
        action: "Consider lowering auto-promotion threshold for stable commands",
      });
    }

    return insights;
  }

  /**
   * Generate full weekly report
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const metrics = this.calculateMetrics();
    const candidates = this.identifyAutomationCandidates();
    const gaps = this.identifyGaps();
    const insights = this.generateInsights();

    return {
      reportDate: timestamp,
      period: "past 7 days",
      summary: {
        title: "Approvals Weekly Report",
        timestamp,
        metrics,
      },
      automationCandidates: {
        count: candidates.length,
        items: candidates,
      },
      gaps: {
        count: gaps.length,
        items: gaps,
      },
      insights: {
        count: insights.length,
        items: insights,
      },
      recommendations: this.generateRecommendations(
        metrics,
        candidates,
        gaps
      ),
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(metrics, candidates, gaps) {
    const recommendations = [];

    if (candidates.length > 0) {
      recommendations.push({
        priority: "high",
        action: "Review high-frequency commands",
        detail: `${candidates.length} commands are candidates for auto-promotion`,
        effort: "1-2 hours",
      });
    }

    if (gaps.length > 0) {
      recommendations.push({
        priority: "medium",
        action: "Address coverage gaps",
        detail: `${gaps.length} gaps identified in approval coverage`,
        effort: "2-4 hours",
      });
    }

    if (parseFloat(metrics.automationRate) < 50) {
      recommendations.push({
        priority: "medium",
        action: "Increase automation",
        detail: `Current automation rate: ${metrics.automationRate}. Target: 70%+`,
        effort: "4-6 hours",
      });
    }

    recommendations.push({
      priority: "low",
      action: "Monitor and maintain",
      detail: "Review approval patterns continuously",
      effort: "ongoing",
    });

    return recommendations;
  }

  /**
   * Save report to file
   */
  saveReport(report, filename = null) {
    const fname =
      filename ||
      `approvals-report-${new Date().toISOString().split("T")[0]}.json`;
    const filepath = path.join(__dirname, fname);

    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2), "utf-8");
      return filepath;
    } catch (e) {
      console.error(`Error saving report: ${e.message}`);
      return null;
    }
  }
}

// Export for module use
export { ApprovalsWeeklyReport };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ApprovalsWeeklyReport();
  const report = generator.generateReport();

  console.log("\n📊 APPROVALS WEEKLY REPORT\n");
  console.log("=" + "=".repeat(60));

  // Summary
  console.log("\nSUMMARY:");
  console.log(`  Period: ${report.period}`);
  console.log(`  Approvals this week: ${report.summary.metrics.totalApprovedThisWeek}`);
  console.log(
    `  Auto-promoted: ${report.summary.metrics.autoPromoted} (${report.summary.metrics.automationRate})`
  );
  console.log(
    `  Manually approved: ${report.summary.metrics.manuallyApproved}`
  );

  // Automation candidates
  if (report.automationCandidates.items.length > 0) {
    console.log("\nAUTOMATION CANDIDATES:");
    report.automationCandidates.items.forEach((item) => {
      console.log(`  • ${item.command}`);
      console.log(`    Occurrences: ${item.occurrences}, ${item.recommendation}`);
    });
  }

  // Gaps
  if (report.gaps.items.length > 0) {
    console.log("\nCOVERAGE GAPS:");
    report.gaps.items.forEach((gap) => {
      console.log(`  • [${gap.severity}] ${gap.description}`);
      console.log(`    → ${gap.recommendation}`);
    });
  }

  // Insights
  if (report.insights.items.length > 0) {
    console.log("\nKEY INSIGHTS:");
    report.insights.items.forEach((insight) => {
      console.log(`  • ${insight.title}`);
      console.log(`    ${insight.description}`);
      console.log(`    Action: ${insight.action}`);
    });
  }

  // Recommendations
  console.log("\nRECOMMENDATIONS:");
  report.recommendations.forEach((rec) => {
    console.log(
      `  [${rec.priority.toUpperCase()}] ${rec.action} (${rec.effort})`
    );
    console.log(`    ${rec.detail}`);
  });

  console.log("\n" + "=".repeat(60));

  // Save report
  const filepath = generator.saveReport(report);
  console.log(`\n✅ Report saved to: ${filepath}\n`);
}
