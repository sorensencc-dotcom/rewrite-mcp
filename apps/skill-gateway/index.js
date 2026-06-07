// Skill Gateway — HTTP API for Copilot & Gemini Integration
// Phase 44.3+ | Makes all 13 skills + 3 workflows available cross-platform

import express from "express";
import cors from "cors";
import { runtime } from "../../skills-runtime/index.js";
import { extendedTelemetry } from "../../skills-runtime/telemetry-extended.js";
import { unifiedStatus } from "../../skills-runtime/unified-status.js";
import { runPhaseSummaryWorkflow } from "../../workflows/phase-summary-roadmap/index.js";
import { runEnvironmentWorkflow } from "../../workflows/environment-check-procedure/index.js";
import { runPipelineWorkflow } from "../../workflows/pipeline-orchestration-dashboard/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// SKILLS ENDPOINTS
// ============================================================================

// List all available skills
app.get("/api/skills", async (req, res) => {
  try {
    const skills = await runtime.getAvailableSkills();
    const manifest = await runtime.getManifest();

    res.json({
      total: skills.length,
      skills: skills.map((name) => {
        const entry = manifest.toolMappings.find((m) => m.skillName === name);
        return {
          name,
          description: entry?.description || "",
          schema: entry?.schema || {}
        };
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invoke a single skill
app.post("/api/skill/:skillName/invoke", async (req, res) => {
  const { skillName } = req.params;
  const payload = req.body;
  const startTime = Date.now();

  try {
    const result = await runtime.invokeSkill(skillName, payload, {
      timeout: 60000,
      retries: 1
    });

    const duration = Date.now() - startTime;
    extendedTelemetry.recordWorkflow(
      `gateway:${skillName}`,
      duration,
      [skillName],
      true
    );

    res.json({
      success: true,
      skill: skillName,
      result,
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    extendedTelemetry.recordWorkflow(
      `gateway:${skillName}`,
      duration,
      [skillName],
      false,
      error
    );

    res.status(500).json({
      success: false,
      skill: skillName,
      error: error.message,
      duration
    });
  }
});

// ============================================================================
// WORKFLOW ENDPOINTS
// ============================================================================

// List all available workflows
app.get("/api/workflows", (req, res) => {
  res.json({
    total: 3,
    workflows: [
      {
        id: "phase-summary-roadmap",
        label: "Phase Summary + Roadmap Update",
        description: "Summarize phase progress and update roadmap",
        inputs: [
          "phaseId",
          "sectionIds",
          "roadmap",
          "artifacts",
          "tests",
          "generateProcedure"
        ]
      },
      {
        id: "environment-check-procedure",
        label: "Environment Check + Procedure",
        description: "Validate environment and generate fixes",
        inputs: [
          "envConfig",
          "logs",
          "generateProcedure",
          "generateRuntimeEstimate"
        ]
      },
      {
        id: "pipeline-orchestration-dashboard",
        label: "Pipeline Orchestration + Dashboard",
        description: "Orchestrate pipeline and show status",
        inputs: [
          "pipelineState",
          "repoActivity",
          "agentActivity",
          "ideaInbox",
          "generateProcedure",
          "harvestIdeas"
        ]
      }
    ]
  });
});

// Execute a workflow
app.post("/api/workflow/:workflowId/execute", async (req, res) => {
  const { workflowId } = req.params;
  const inputs = req.body;
  const startTime = Date.now();

  try {
    let result;

    if (workflowId === "phase-summary-roadmap") {
      result = await runPhaseSummaryWorkflow({
        phaseId: inputs.phaseId,
        sectionIds: Array.isArray(inputs.sectionIds)
          ? inputs.sectionIds
          : inputs.sectionIds.split(",").map((s) => s.trim()),
        roadmap: typeof inputs.roadmap === "string" ? JSON.parse(inputs.roadmap) : inputs.roadmap,
        artifacts: inputs.artifacts ? (Array.isArray(inputs.artifacts) ? inputs.artifacts : inputs.artifacts.split(",").map((s) => s.trim())) : [],
        tests: inputs.tests ? (Array.isArray(inputs.tests) ? inputs.tests : inputs.tests.split(",").map((s) => s.trim())) : [],
        generateProcedure: inputs.generateProcedure !== false
      });
    } else if (workflowId === "environment-check-procedure") {
      result = await runEnvironmentWorkflow({
        envConfig: typeof inputs.envConfig === "string" ? JSON.parse(inputs.envConfig) : inputs.envConfig,
        logs: Array.isArray(inputs.logs) ? inputs.logs : JSON.parse(inputs.logs),
        generateProcedure: inputs.generateProcedure !== false,
        generateRuntimeEstimate: inputs.generateRuntimeEstimate !== false
      });
    } else if (workflowId === "pipeline-orchestration-dashboard") {
      result = await runPipelineWorkflow({
        pipelineState: typeof inputs.pipelineState === "string" ? JSON.parse(inputs.pipelineState) : inputs.pipelineState,
        repoActivity: Array.isArray(inputs.repoActivity) ? inputs.repoActivity : JSON.parse(inputs.repoActivity),
        agentActivity: Array.isArray(inputs.agentActivity) ? inputs.agentActivity : JSON.parse(inputs.agentActivity),
        ideaInbox: Array.isArray(inputs.ideaInbox) ? inputs.ideaInbox : JSON.parse(inputs.ideaInbox),
        generateProcedure: inputs.generateProcedure !== false,
        harvestIdeas: inputs.harvestIdeas !== false
      });
    } else {
      return res.status(404).json({ error: `Unknown workflow: ${workflowId}` });
    }

    const duration = Date.now() - startTime;
    extendedTelemetry.recordWorkflow(
      workflowId,
      duration,
      result.metadata?.skillChainUsed || [],
      true
    );

    res.json({
      success: true,
      workflow: workflowId,
      result,
      duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    extendedTelemetry.recordWorkflow(
      workflowId,
      duration,
      [],
      false,
      error
    );

    res.status(500).json({
      success: false,
      workflow: workflowId,
      error: error.message,
      duration
    });
  }
});

// ============================================================================
// STATUS & TELEMETRY ENDPOINTS
// ============================================================================

// Get unified system status
app.get("/api/status", (req, res) => {
  const snapshot = unifiedStatus.computeSnapshot();
  res.json(snapshot);
});

// Get telemetry dashboard data
app.get("/api/telemetry", (req, res) => {
  const data = extendedTelemetry.export();
  res.json(data);
});

// Get skill metrics
app.get("/api/telemetry/skill/:skillName", (req, res) => {
  const metrics = extendedTelemetry.getWorkflowMetrics(req.params.skillName);
  if (!metrics) {
    return res.status(404).json({ error: "No metrics for skill" });
  }
  res.json(metrics);
});

// Get alerts
app.get("/api/alerts", (req, res) => {
  const severity = req.query.severity;
  const limit = parseInt(req.query.limit) || 20;
  const alerts = extendedTelemetry.getAlerts(
    severity ? { severity, limit } : { limit }
  );
  res.json({ total: alerts.length, alerts });
});

// Get health status
app.get("/api/health", (req, res) => {
  const snapshot = unifiedStatus.getSnapshot();
  const health = snapshot?.health || { overall: 0, status: "unknown" };

  res.json({
    status: health.status,
    score: health.overall,
    timestamp: new Date().toISOString(),
    components: {
      phase: health.phase,
      environment: health.environment,
      pipeline: health.pipeline
    }
  });
});

// ============================================================================
// DOCUMENTATION ENDPOINTS
// ============================================================================

// API documentation
app.get("/api/docs", (req, res) => {
  res.json({
    name: "Skill Gateway API",
    version: "1.0.0",
    description: "HTTP Gateway for Skill Runtime — Copilot & Gemini Integration",
    endpoints: {
      skills: {
        "GET /api/skills": "List all 13 available skills",
        "POST /api/skill/:skillName/invoke": "Invoke a skill with payload"
      },
      workflows: {
        "GET /api/workflows": "List all 3 available workflows",
        "POST /api/workflow/:workflowId/execute": "Execute a workflow"
      },
      status: {
        "GET /api/status": "Get unified system status snapshot",
        "GET /api/health": "Get health summary (status, score, components)",
        "GET /api/alerts": "Get recent alerts (supports ?severity=error&limit=20)"
      },
      telemetry: {
        "GET /api/telemetry": "Get full telemetry dashboard data",
        "GET /api/telemetry/skill/:skillName": "Get metrics for specific skill"
      }
    }
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Skill Gateway",
    status: "running",
    documentation: "/api/docs",
    version: "1.0.0"
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({ error: error.message });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          Skill Gateway Running                         ║
║                                                        ║
║  HTTP:     http://localhost:${PORT}                       ║
║  API Docs: http://localhost:${PORT}/api/docs          ║
║                                                        ║
║  Available:                                            ║
║  • 13 Skills (via /api/skill/:skillName/invoke)       ║
║  • 3 Workflows (via /api/workflow/:id/execute)        ║
║  • Telemetry (via /api/telemetry)                     ║
║  • Status (via /api/status)                           ║
║                                                        ║
║  Copilot & Gemini can now access all skills!          ║
╚════════════════════════════════════════════════════════╝
  `);
});
