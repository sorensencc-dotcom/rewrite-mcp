// Extended Telemetry — Workflow + System Metrics
// Phase 44.3-A

import { telemetry } from "./telemetry.js";

const workflowMetrics = {};
const systemMetrics = {
  pipelineHealth: 0,
  environmentHealth: 0,
  phaseProgress: 0,
  ideaInboxDelta: 0,
  roadmapVersionDelta: null
};

export class ExtendedTelemetry {
  constructor() {
    this.workflowMetrics = workflowMetrics;
    this.systemMetrics = systemMetrics;
    this.alerts = [];
  }

  recordWorkflow(workflowId, durationMs, skillsUsed, success, error = null) {
    if (!workflowMetrics[workflowId]) {
      workflowMetrics[workflowId] = {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastRun: null,
        runs: []
      };
    }

    const metric = workflowMetrics[workflowId];
    const run = {
      timestamp: new Date().toISOString(),
      durationMs,
      skillsUsed,
      success,
      error: error ? error.message : null
    };

    metric.runs.push(run);
    if (metric.runs.length > 100) metric.runs.shift();

    metric.totalRuns++;
    if (success) {
      metric.successfulRuns++;
    } else {
      metric.failedRuns++;
    }
    metric.totalDuration += durationMs;
    metric.averageDuration = metric.totalDuration / metric.totalRuns;
    metric.minDuration = Math.min(metric.minDuration, durationMs);
    metric.maxDuration = Math.max(metric.maxDuration, durationMs);
    metric.lastRun = run;

    this.checkWorkflowAlerts(workflowId, metric);
  }

  checkWorkflowAlerts(workflowId, metric) {
    const errorRate = metric.failedRuns / metric.totalRuns;
    if (errorRate > 0.1) {
      this.addAlert({
        severity: "error",
        type: "high-error-rate",
        workflow: workflowId,
        message: `Workflow ${workflowId} has ${(errorRate * 100).toFixed(1)}% error rate`,
        timestamp: new Date().toISOString()
      });
    }

    const p95Duration = metric.averageDuration * 1.5;
    if (metric.lastRun && metric.lastRun.durationMs > p95Duration) {
      this.addAlert({
        severity: "warning",
        type: "slow-workflow",
        workflow: workflowId,
        message: `Workflow ${workflowId} duration ${metric.lastRun.durationMs}ms exceeds p95 ${Math.round(p95Duration)}ms`,
        timestamp: new Date().toISOString()
      });
    }
  }

  updateSystemMetrics(metrics) {
    Object.assign(systemMetrics, metrics);

    // Check system alerts
    if (systemMetrics.environmentHealth < 0.5) {
      this.addAlert({
        severity: "error",
        type: "environment-critical",
        message: "Environment health critical",
        timestamp: new Date().toISOString()
      });
    }

    if (systemMetrics.pipelineHealth < 0.3) {
      this.addAlert({
        severity: "error",
        type: "pipeline-blocked",
        message: "Pipeline health critical",
        timestamp: new Date().toISOString()
      });
    }
  }

  addAlert(alert) {
    this.alerts.push(alert);
    if (this.alerts.length > 50) this.alerts.shift();
  }

  getWorkflowMetrics(workflowId) {
    if (workflowId) {
      return workflowMetrics[workflowId] || null;
    }
    return workflowMetrics;
  }

  getSystemMetrics() {
    return systemMetrics;
  }

  getAlerts(filter = {}) {
    let alerts = this.alerts;
    if (filter.severity) {
      alerts = alerts.filter((a) => a.severity === filter.severity);
    }
    if (filter.type) {
      alerts = alerts.filter((a) => a.type === filter.type);
    }
    return alerts.slice(-filter.limit || 20);
  }

  getLatencyPercentiles(skillName) {
    const skillMetrics = telemetry.getMetrics(skillName);
    if (!skillMetrics) return null;

    return {
      p50: skillMetrics.averageDuration,
      p95: skillMetrics.averageDuration * 1.5,
      p99: skillMetrics.averageDuration * 2.0,
      min: skillMetrics.minDuration,
      max: skillMetrics.maxDuration
    };
  }

  getErrorCategories(skillName) {
    const errors = telemetry.getErrors(skillName);
    if (!errors) return {};

    const categories = {};
    errors.forEach((e) => {
      const type = e.errorType || "Unknown";
      categories[type] = (categories[type] || 0) + 1;
    });
    return categories;
  }

  export() {
    return {
      timestamp: new Date().toISOString(),
      workflows: workflowMetrics,
      system: systemMetrics,
      alerts: this.alerts.slice(-20),
      skills: telemetry.export()
    };
  }

  reset() {
    Object.keys(workflowMetrics).forEach((key) => delete workflowMetrics[key]);
    this.alerts = [];
    Object.assign(systemMetrics, {
      pipelineHealth: 0,
      environmentHealth: 0,
      phaseProgress: 0,
      ideaInboxDelta: 0,
      roadmapVersionDelta: null
    });
  }
}

export const extendedTelemetry = new ExtendedTelemetry();
