// Operator Console — UI Controller
// Phase 44.3-C

import { runPhaseSummaryWorkflow } from "../../workflows/phase-summary-roadmap/index.js";
import { runEnvironmentWorkflow } from "../../workflows/environment-check-procedure/index.js";
import { runPipelineWorkflow } from "../../workflows/pipeline-orchestration-dashboard/index.js";
import { unifiedStatus } from "../../skills-runtime/unified-status.js";
import { extendedTelemetry } from "../../skills-runtime/telemetry-extended.js";

const WORKFLOWS = {
  "phase-summary-roadmap": {
    label: "Phase Summary + Roadmap Update",
    fn: runPhaseSummaryWorkflow,
    inputs: [
      { name: "phaseId", label: "Phase ID", type: "text", placeholder: "e.g., phase-44.0", required: true },
      { name: "sectionIds", label: "Section IDs (comma-separated)", type: "text", placeholder: "e.g., §0.4,§0.5,§0.6", required: true },
      { name: "roadmap", label: "Roadmap (JSON)", type: "textarea", placeholder: "{}", required: true },
      { name: "artifacts", label: "Artifacts (comma-separated)", type: "text", placeholder: "src/phase44/**/*.ts" },
      { name: "tests", label: "Tests (comma-separated)", type: "text", placeholder: "test:phase-44" }
    ]
  },
  "environment-check-procedure": {
    label: "Environment Check + Procedure",
    fn: runEnvironmentWorkflow,
    inputs: [
      { name: "osType", label: "Operating System", type: "select", options: ["win32", "linux", "darwin"], required: true },
      { name: "nodeVersion", label: "Node.js Version", type: "text", placeholder: "18.0.0", required: true },
      { name: "wslVersion", label: "WSL Version", type: "select", options: ["WSL1", "WSL2"] },
      { name: "pythonVersion", label: "Python Version", type: "text", placeholder: "3.11" },
      { name: "logs", label: "Logs (JSON array)", type: "textarea", placeholder: "[]", required: true }
    ]
  },
  "pipeline-orchestration-dashboard": {
    label: "Pipeline Orchestration + Dashboard",
    fn: runPipelineWorkflow,
    inputs: [
      { name: "stages", label: "Pipeline Stages (JSON array)", type: "textarea", placeholder: '["Discovery", "Harvester", "Redesign"]', required: true },
      { name: "current", label: "Current Stage", type: "text", placeholder: "Redesign", required: true },
      { name: "repoActivity", label: "Repo Activity (JSON array)", type: "textarea", placeholder: "[]", required: true },
      { name: "agentActivity", label: "Agent Activity (JSON array)", type: "textarea", placeholder: "[]", required: true },
      { name: "ideaInbox", label: "Ideas (JSON array)", type: "textarea", placeholder: "[]", required: true }
    ]
  }
};

let currentWorkflow = "phase-summary-roadmap";
let lastResult = null;
let activeTab = "result";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupWorkflowSelectors();
  setupOutputTabs();
  setupRunButton();
  updateSystemStatus();
  renderInputPanel();
  setInterval(updateSystemStatus, 5000);
});

function setupWorkflowSelectors() {
  document.querySelectorAll(".workflow-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".workflow-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentWorkflow = btn.dataset.workflow;
      renderInputPanel();
      document.getElementById("outputPanel").textContent = "Workflow changed. Ready to run...";
    });
  });
}

function setupOutputTabs() {
  document.querySelectorAll(".output-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".output-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      renderOutput();
    });
  });
}

function setupRunButton() {
  document.getElementById("runButton").addEventListener("click", runWorkflow);
}

function renderInputPanel() {
  const workflow = WORKFLOWS[currentWorkflow];
  const panel = document.getElementById("inputPanel");
  panel.innerHTML = "";

  workflow.inputs.forEach((input) => {
    const group = document.createElement("div");
    group.className = "input-group";

    const label = document.createElement("label");
    label.className = "input-label";
    label.textContent = input.label + (input.required ? " *" : "");

    group.appendChild(label);

    if (input.type === "select") {
      const select = document.createElement("select");
      select.className = "input-field";
      select.name = input.name;
      input.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      group.appendChild(select);
    } else if (input.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.className = "input-field";
      textarea.name = input.name;
      textarea.placeholder = input.placeholder;
      textarea.style.height = "100px";
      textarea.style.fontFamily = "monospace";
      group.appendChild(textarea);
    } else {
      const field = document.createElement("input");
      field.className = "input-field";
      field.type = input.type;
      field.name = input.name;
      field.placeholder = input.placeholder;
      group.appendChild(field);
    }

    panel.appendChild(group);
  });
}

function renderOutput() {
  const panel = document.getElementById("outputPanel");

  if (!lastResult) {
    panel.textContent = "No output yet. Run a workflow to see results.";
    return;
  }

  if (activeTab === "result") {
    panel.textContent = JSON.stringify(lastResult, null, 2);
  } else if (activeTab === "telemetry") {
    const workflowMetrics = extendedTelemetry.getWorkflowMetrics(currentWorkflow);
    panel.textContent = JSON.stringify(workflowMetrics, null, 2);
  } else if (activeTab === "alerts") {
    const alerts = extendedTelemetry.getAlerts({ limit: 20 });
    panel.textContent = JSON.stringify(alerts, null, 2);
  }
}

async function runWorkflow() {
  const runBtn = document.getElementById("runButton");
  const panel = document.getElementById("outputPanel");

  runBtn.disabled = true;
  runBtn.textContent = "Running...";
  panel.textContent = "Executing workflow...";

  try {
    const inputs = collectInputs();
    const workflow = WORKFLOWS[currentWorkflow];
    const startTime = Date.now();

    let result;
    if (currentWorkflow === "phase-summary-roadmap") {
      result = await workflow.fn({
        phaseId: inputs.phaseId,
        sectionIds: inputs.sectionIds.split(",").map((s) => s.trim()),
        roadmap: JSON.parse(inputs.roadmap),
        artifacts: inputs.artifacts ? inputs.artifacts.split(",").map((s) => s.trim()) : [],
        tests: inputs.tests ? inputs.tests.split(",").map((s) => s.trim()) : []
      });
    } else if (currentWorkflow === "environment-check-procedure") {
      result = await workflow.fn({
        envConfig: {
          os: inputs.osType,
          nodeVersion: inputs.nodeVersion,
          wslVersion: inputs.wslVersion,
          pythonVersion: inputs.pythonVersion
        },
        logs: JSON.parse(inputs.logs)
      });
    } else if (currentWorkflow === "pipeline-orchestration-dashboard") {
      result = await workflow.fn({
        pipelineState: {
          stages: JSON.parse(inputs.stages),
          current: inputs.current,
          status: "running"
        },
        repoActivity: JSON.parse(inputs.repoActivity),
        agentActivity: JSON.parse(inputs.agentActivity),
        ideaInbox: JSON.parse(inputs.ideaInbox)
      });
    }

    const duration = Date.now() - startTime;
    lastResult = { ...result, _duration: duration };

    extendedTelemetry.recordWorkflow(currentWorkflow, duration, result.metadata?.skillChainUsed || [], true);

    renderOutput();
    panel.classList.remove("output-error");
    panel.classList.add("output-success");
  } catch (error) {
    lastResult = { error: error.message, stack: error.stack };
    extendedTelemetry.recordWorkflow(currentWorkflow, 0, [], false, error);
    panel.textContent = `Error: ${error.message}`;
    panel.classList.add("output-error");
    renderOutput();
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Run Workflow";
    updateSystemStatus();
  }
}

function collectInputs() {
  const inputs = {};
  document.querySelectorAll(".input-field").forEach((field) => {
    inputs[field.name] = field.value;
  });
  return inputs;
}

function updateSystemStatus() {
  const snapshot = unifiedStatus.computeSnapshot();

  document.getElementById("phaseProgress").textContent = `${Math.round(snapshot.phase.completion * 100)}%`;
  document.getElementById("envStatus").textContent = snapshot.environment.status.toUpperCase();
  document.getElementById("pipelineHealth").textContent = snapshot.health.pipeline > 0.75 ? "✓" : "⚠";
  document.getElementById("overallHealth").textContent = snapshot.health.status.toUpperCase();

  const badge = document.getElementById("statusBadge");
  badge.className = `status-badge status-${snapshot.health.status === "healthy" ? "healthy" : snapshot.health.status === "degraded" ? "degraded" : "critical"}`;
  badge.textContent = snapshot.health.status.toUpperCase();
}
