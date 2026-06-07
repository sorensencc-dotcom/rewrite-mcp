// Telemetry Dashboard Visualizations
// Phase 44.3-B

import { runtime } from "../../skills-runtime/index.js";
import { extendedTelemetry } from "../../skills-runtime/telemetry-extended.js";
import { unifiedStatus } from "../../skills-runtime/unified-status.js";

export class TelemetryDashboard {
  constructor() {
    this.refreshInterval = 5000;
  }

  // Skill Performance Panel
  getSkillPerformanceData() {
    const metrics = runtime.getTelemetry()?.metrics || {};
    const skills = Object.entries(metrics)
      .map(([name, data]) => ({
        name,
        invocations: data.totalInvocations || 0,
        successRate: (data.successfulInvocations || 0) / (data.totalInvocations || 1),
        avgDuration: data.averageDuration || 0,
        errors: data.failedInvocations || 0
      }))
      .sort((a, b) => b.invocations - a.invocations);

    return {
      type: "skill-performance",
      title: "Skill Performance",
      data: skills,
      summary: {
        totalSkills: skills.length,
        totalInvocations: skills.reduce((sum, s) => sum + s.invocations, 0),
        averageSuccessRate: (skills.reduce((sum, s) => sum + s.successRate, 0) / skills.length).toFixed(2)
      }
    };
  }

  // Workflow Performance Panel
  getWorkflowPerformanceData() {
    const workflows = extendedTelemetry.getWorkflowMetrics();
    const workflowArray = Object.entries(workflows || {})
      .map(([id, data]) => ({
        id,
        totalRuns: data.totalRuns || 0,
        successRate: ((data.successfulRuns || 0) / (data.totalRuns || 1)).toFixed(2),
        avgDuration: data.averageDuration || 0,
        lastRun: data.lastRun?.timestamp
      }))
      .sort((a, b) => b.totalRuns - a.totalRuns);

    return {
      type: "workflow-performance",
      title: "Workflow Performance",
      data: workflowArray,
      summary: {
        totalWorkflows: workflowArray.length,
        totalRuns: workflowArray.reduce((sum, w) => sum + w.totalRuns, 0),
        averageSuccessRate: (
          workflowArray.reduce((sum, w) => sum + parseFloat(w.successRate), 0) / workflowArray.length
        ).toFixed(2)
      }
    };
  }

  // System Health Panel
  getSystemHealthData() {
    const snapshot = unifiedStatus.computeSnapshot();
    const metrics = extendedTelemetry.getSystemMetrics();

    return {
      type: "system-health",
      title: "System Health",
      data: {
        phase: {
          current: snapshot.phase.current,
          completion: snapshot.phase.completion,
          health: snapshot.health.phase
        },
        environment: {
          status: snapshot.environment.status,
          health: snapshot.health.environment,
          issues: snapshot.environment.issues.length
        },
        pipeline: {
          current: snapshot.pipeline.current,
          health: snapshot.health.pipeline,
          blocked: snapshot.pipeline.blockedStages.length
        },
        telemetry: metrics
      },
      overallHealth: snapshot.health.status,
      overallScore: snapshot.health.overall
    };
  }

  // Alerts Panel
  getAlertsData() {
    const alerts = extendedTelemetry.getAlerts({ limit: 50 });
    const grouped = {
      error: alerts.filter((a) => a.severity === "error"),
      warning: alerts.filter((a) => a.severity === "warning"),
      info: alerts.filter((a) => a.severity === "info")
    };

    return {
      type: "alerts",
      title: "System Alerts",
      total: alerts.length,
      critical: grouped.error.length,
      warnings: grouped.warning.length,
      alerts: alerts.slice(0, 20)
    };
  }

  // Export all panels
  exportAll() {
    return {
      timestamp: new Date().toISOString(),
      panels: {
        skills: this.getSkillPerformanceData(),
        workflows: this.getWorkflowPerformanceData(),
        health: this.getSystemHealthData(),
        alerts: this.getAlertsData()
      }
    };
  }

  // Render as text/ASCII for terminal
  renderAsText() {
    const data = this.exportAll();
    const lines = [];

    lines.push("═".repeat(80));
    lines.push("TELEMETRY DASHBOARD " + data.timestamp);
    lines.push("═".repeat(80));

    // Skills
    const skills = data.panels.skills;
    lines.push("\n📊 SKILL PERFORMANCE");
    lines.push("─".repeat(80));
    skills.data.slice(0, 5).forEach((s) => {
      lines.push(
        `  ${s.name.padEnd(30)} │ ${String(s.invocations).padStart(4)} calls │ ${(s.successRate * 100).toFixed(1).padStart(5)}% │ ${s.avgDuration.toFixed(0)}ms`
      );
    });

    // Workflows
    const workflows = data.panels.workflows;
    lines.push("\n🔄 WORKFLOW PERFORMANCE");
    lines.push("─".repeat(80));
    workflows.data.forEach((w) => {
      lines.push(
        `  ${w.id.padEnd(30)} │ ${String(w.totalRuns).padStart(4)} runs │ ${w.successRate.padStart(5)}% │ ${w.avgDuration.toFixed(0)}ms`
      );
    });

    // Health
    const health = data.panels.health;
    lines.push("\n❤️  SYSTEM HEALTH");
    lines.push("─".repeat(80));
    lines.push(`  Phase        │ ${health.data.phase.current.padEnd(20)} │ ${(health.data.phase.completion * 100).toFixed(0)}% complete`);
    lines.push(`  Environment  │ ${health.data.environment.status.padEnd(20)} │ ${health.data.environment.issues} issues`);
    lines.push(`  Pipeline     │ ${health.data.pipeline.current.padEnd(20)} │ ${health.data.pipeline.blocked} blocked`);
    lines.push(`  Overall      │ ${health.overallHealth.toUpperCase().padEnd(20)} │ ${(health.overallScore * 100).toFixed(0)}%`);

    // Alerts
    const alerts = data.panels.alerts;
    if (alerts.critical > 0 || alerts.warnings > 0) {
      lines.push("\n⚠️  ALERTS");
      lines.push("─".repeat(80));
      lines.push(`  Critical │ ${alerts.critical}`);
      lines.push(`  Warnings │ ${alerts.warnings}`);
      alerts.alerts.slice(0, 5).forEach((a) => {
        const icon = a.severity === "error" ? "🔴" : a.severity === "warning" ? "🟡" : "🔵";
        lines.push(`  ${icon} ${a.message}`);
      });
    }

    lines.push("\n" + "═".repeat(80));
    return lines.join("\n");
  }
}

export const telemetryDashboard = new TelemetryDashboard();
