// Unified Status Layer — System Snapshot
// Phase 44.3-D

import { runtime } from "./index.js";
import { extendedTelemetry } from "./telemetry-extended.js";

export class UnifiedStatus {
  constructor() {
    this.lastSnapshot = null;
    this.snapshotHistory = [];
  }

  computeSnapshot() {
    const now = new Date().toISOString();

    // Phase status
    const phaseContext = runtime.getContext("phase");
    const phaseStatus = {
      current: phaseContext?.current || "unknown",
      completion: phaseContext?.lastSummary?.totalPercentComplete || 0,
      lastSummary: phaseContext?.lastSummary || null,
      roadmapVersion: runtime.getContext("roadmap")?.lastVersion || "unknown"
    };

    // Environment status
    const envContext = runtime.getContext("environment");
    const envStatus = {
      status: envContext?.lastCheck?.status || "unknown",
      isCompatible: envContext?.lastCheck?.isCompatible || false,
      issues: (envContext?.issues || []).slice(0, 3),
      lastCheck: envContext?.lastCheck || null
    };

    // Pipeline status
    const pipelineContext = runtime.getContext("pipeline");
    const pipelineStatus = {
      current: pipelineContext?.currentState?.current || "unknown",
      blockedStages: pipelineContext?.currentState?.blockedStages || [],
      longRunningTasks: [],
      lastBrief: pipelineContext?.lastBrief || null
    };

    // Telemetry status
    const skillMetrics = extendedTelemetry.getSystemMetrics();
    const allWorkflows = extendedTelemetry.getWorkflowMetrics();
    const workflowUsage = Object.entries(allWorkflows || {}).reduce(
      (acc, [wfId, wf]) => {
        acc[wfId] = wf.totalRuns;
        return acc;
      },
      {}
    );

    const topSkills = Object.entries(runtime.getTelemetry()?.metrics || {})
      .sort(([, a], [, b]) => (b.totalInvocations || 0) - (a.totalInvocations || 0))
      .slice(0, 5)
      .map(([name]) => name);

    const telemetryStatus = {
      topSkills,
      workflowUsage,
      skillMetrics,
      alerts: extendedTelemetry.getAlerts({ limit: 5 })
    };

    // Compute health scores
    const healthScores = this.computeHealthScores(
      phaseStatus,
      envStatus,
      pipelineStatus
    );

    const snapshot = {
      timestamp: now,
      phase: phaseStatus,
      environment: envStatus,
      pipeline: pipelineStatus,
      telemetry: telemetryStatus,
      health: healthScores,
      summary: this.generateSummary(phaseStatus, envStatus, pipelineStatus)
    };

    this.lastSnapshot = snapshot;
    this.snapshotHistory.push(snapshot);
    if (this.snapshotHistory.length > 100) this.snapshotHistory.shift();

    return snapshot;
  }

  computeHealthScores(phase, env, pipeline) {
    const phaseHealth = Math.min(100, phase.completion * 100) / 100;
    const environmentHealth = env.status === "ready" ? 1.0 : env.status === "degraded" ? 0.5 : 0;
    const pipelineHealth = pipeline.blockedStages.length === 0 ? 1.0 : Math.max(0, 1 - pipeline.blockedStages.length * 0.25);
    const overallHealth = (phaseHealth + environmentHealth + pipelineHealth) / 3;

    return {
      phase: phaseHealth,
      environment: environmentHealth,
      pipeline: pipelineHealth,
      overall: overallHealth,
      status: overallHealth > 0.75 ? "healthy" : overallHealth > 0.5 ? "degraded" : "critical"
    };
  }

  generateSummary(phase, env, pipeline) {
    const parts = [];

    parts.push(`Phase ${phase.current} @ ${Math.round(phase.completion * 100)}%`);

    if (env.status !== "ready") {
      parts.push(`Environment: ${env.status}`);
    }

    if (pipeline.blockedStages.length > 0) {
      parts.push(`${pipeline.blockedStages.length} pipeline blocker(s)`);
    }

    return parts.join(" • ");
  }

  getSnapshot() {
    return this.lastSnapshot || this.computeSnapshot();
  }

  getHistory(limit = 20) {
    return this.snapshotHistory.slice(-limit);
  }

  getTrend(metric, window = 10) {
    const history = this.snapshotHistory.slice(-window);
    if (history.length < 2) return null;

    const values = history.map((s) => {
      if (metric === "phase") return s.phase.completion;
      if (metric === "environment") return s.health.environment;
      if (metric === "pipeline") return s.health.pipeline;
      if (metric === "overall") return s.health.overall;
      return 0;
    });

    const start = values[0];
    const end = values[values.length - 1];
    const delta = end - start;
    const trend = delta > 0.05 ? "improving" : delta < -0.05 ? "degrading" : "stable";

    return { start, end, delta, trend };
  }

  export() {
    return {
      current: this.getSnapshot(),
      history: this.getHistory(10),
      trends: {
        phase: this.getTrend("phase"),
        environment: this.getTrend("environment"),
        pipeline: this.getTrend("pipeline"),
        overall: this.getTrend("overall")
      }
    };
  }
}

export const unifiedStatus = new UnifiedStatus();
