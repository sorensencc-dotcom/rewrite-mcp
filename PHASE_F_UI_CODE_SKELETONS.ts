// PHASE F UI CODE SKELETONS
// Minimal, production-ready vanilla JavaScript implementations
// No frameworks, no dependencies, vanilla DOM manipulation

// ============================================================================
// src/operator-console/js/app.js
// ============================================================================

export function initApp() {
  const state = createStateStore();
  const api = createApiClient(state);
  initRouter(state, api);
  startPolling(api, state);
}

function startPolling(api, state) {
  setInterval(async () => {
    try {
      await Promise.all([
        api.fetchPipeline(),
        api.fetchMcpHealth(),
        api.fetchTraces(),
        api.fetchConfig(),
        api.fetchGovernance()
      ]);
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 1000);
}

// ============================================================================
// src/operator-console/js/state.js
// ============================================================================

export function createStateStore() {
  let current = {
    pipeline: null,
    mcp: null,
    traces: [],
    config: null,
    governance: null,
    currentTrace: null
  };

  const subscribers = [];

  function update(partial) {
    current = { ...current, ...partial };
    subscribers.forEach(fn => fn(current));
  }

  function subscribe(fn) {
    subscribers.push(fn);
    fn(current);
    return () => {
      subscribers.splice(subscribers.indexOf(fn), 1);
    };
  }

  function get() {
    return current;
  }

  return { update, subscribe, get };
}

// ============================================================================
// src/operator-console/js/api.js
// ============================================================================

export function createApiClient(state) {
  const baseUrl = "";
  let adminToken = localStorage.getItem("admin_token") || "";

  async function fetchJSON(url, options = {}) {
    const response = await fetch(baseUrl + url, {
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async function fetchPipeline() {
    const pipeline = await fetchJSON("/api/pipeline");
    state.update({ pipeline });
  }

  async function fetchMcpHealth() {
    const mcp = await fetchJSON("/api/mcp/health");
    state.update({ mcp });
  }

  async function fetchTraces() {
    const traces = await fetchJSON("/api/traces?limit=20");
    state.update({ traces });
  }

  async function fetchConfig() {
    const config = await fetchJSON("/api/config");
    state.update({ config });
  }

  async function fetchGovernance() {
    const governance = await fetchJSON("/api/governance");
    state.update({ governance });
  }

  async function saveConfig(config) {
    await fetchJSON("/api/config", {
      method: "POST",
      body: JSON.stringify(config),
    });
    await fetchConfig();
  }

  async function clearCache() {
    await fetchJSON("/admin/cache/clear", {
      method: "POST",
    });
  }

  return {
    fetchPipeline,
    fetchMcpHealth,
    fetchTraces,
    fetchConfig,
    fetchGovernance,
    saveConfig,
    clearCache,
    setAdminToken: (token) => {
      adminToken = token;
      localStorage.setItem("admin_token", token);
    },
  };
}

// ============================================================================
// src/operator-console/js/router.js
// ============================================================================

import { renderPipelinePanel } from "./components/pipeline.js";
import { renderMcpGrid } from "./components/mcpGrid.js";
import { renderTraceExplorer } from "./components/traceView.js";
import { renderConfigEditor } from "./components/configEditor.js";
import { renderGovernancePanel } from "./components/governance.js";

export function initRouter(state, api) {
  function render() {
    const hash = window.location.hash.slice(1) || "pipeline";
    const root = document.getElementById("app");

    if (!root) {
      console.error("Root element #app not found");
      return;
    }

    root.innerHTML = "";

    const panels = {
      pipeline: () => renderPipelinePanel(root, state),
      mcp: () => renderMcpGrid(root, state),
      traces: () => renderTraceExplorer(root, state),
      config: () => renderConfigEditor(root, state, api),
      governance: () => renderGovernancePanel(root, state),
    };

    const renderer = panels[hash] || panels.pipeline;
    renderer();
  }

  window.addEventListener("hashchange", render);
  state.subscribe(() => render());
  render();
}

// ============================================================================
// src/operator-console/js/components/pipeline.js
// ============================================================================

export function renderPipelinePanel(root, state) {
  const { pipeline } = state.get();
  const container = document.createElement("div");
  container.className = "panel pipeline-panel";

  if (!pipeline || !pipeline.stages) {
    container.innerHTML = "<p>No pipeline data yet.</p>";
    root.appendChild(container);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = "CIC Main Pipeline — Live Execution";
  container.appendChild(title);

  const table = document.createElement("table");
  table.className = "stages-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Stage</th>
        <th>Status</th>
        <th>Latency</th>
        <th>Retries</th>
        <th>Cache</th>
        <th>Breaker</th>
      </tr>
    </thead>
    <tbody>
      ${pipeline.stages
        .map(
          (s) => `
        <tr class="${s.status.toLowerCase()}">
          <td>${s.name}</td>
          <td>${s.status}</td>
          <td>${s.latencyMs}ms</td>
          <td>${s.retryCount}</td>
          <td>${s.cacheHit ? "HIT" : "MISS"}</td>
          <td>${s.breakerState}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;

  container.appendChild(table);
  root.appendChild(container);
}

// ============================================================================
// src/operator-console/js/components/mcpGrid.js
// ============================================================================

export function renderMcpGrid(root, state) {
  const { mcp } = state.get();
  const container = document.createElement("div");
  container.className = "panel mcp-grid-panel";

  if (!mcp) {
    container.innerHTML = "<p>No MCP data yet.</p>";
    root.appendChild(container);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = "MCP Server Health (7070-7074)";
  container.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "mcp-grid";

  [7070, 7071, 7072, 7073, 7074].forEach((port) => {
    const server = mcp[port] || {};
    const card = document.createElement("div");
    card.className = `mcp-card ${server.healthy ? "healthy" : "down"}`;
    card.innerHTML = `
      <h3>Port ${port}</h3>
      <div class="status">${server.healthy ? "UP" : "DOWN"}</div>
      <div class="latency">${server.latencyMs || 0}ms</div>
      <div class="error-rate">${(server.errorRate || 0).toFixed(2)}%</div>
      <div class="version">${server.version || "unknown"}</div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
  root.appendChild(container);
}

// ============================================================================
// src/operator-console/js/components/traceView.js
// ============================================================================

export function renderTraceExplorer(root, state) {
  const { traces, currentTrace } = state.get();
  const container = document.createElement("div");
  container.className = "panel trace-explorer-panel";

  const title = document.createElement("h2");
  title.textContent = "Trace Explorer";
  container.appendChild(title);

  const traceList = document.createElement("div");
  traceList.className = "trace-list";

  if (!traces || traces.length === 0) {
    traceList.textContent = "No traces yet.";
  } else {
    traces.forEach((trace) => {
      const button = document.createElement("button");
      button.className = "trace-button";
      button.textContent = `${trace.traceId} (${trace.durationMs}ms)`;
      button.onclick = () => {
        state.update({ currentTrace: trace });
      };
      traceList.appendChild(button);
    });
  }

  container.appendChild(traceList);

  const detail = document.createElement("div");
  detail.className = "trace-detail";

  if (currentTrace && currentTrace.spans) {
    const heading = document.createElement("h3");
    heading.textContent = `Trace: ${currentTrace.traceId}`;
    detail.appendChild(heading);

    const info = document.createElement("p");
    info.textContent = `Duration: ${currentTrace.durationMs}ms, Spans: ${currentTrace.spans.length}`;
    detail.appendChild(info);

    const spanList = document.createElement("ul");
    currentTrace.spans.forEach((span) => {
      const li = document.createElement("li");
      li.textContent = `${span.name} — ${span.durationMs}ms (${span.status})`;
      spanList.appendChild(li);
    });
    detail.appendChild(spanList);
  } else {
    detail.textContent = "Select a trace to view details.";
  }

  container.appendChild(detail);
  root.appendChild(container);
}

// ============================================================================
// src/operator-console/js/components/configEditor.js
// ============================================================================

export function renderConfigEditor(root, state, api) {
  const { config } = state.get();
  const container = document.createElement("div");
  container.className = "panel config-editor-panel";

  if (!config) {
    container.innerHTML = "<p>No config loaded yet.</p>";
    root.appendChild(container);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = "Configuration Editor";
  container.appendChild(title);

  const form = document.createElement("form");

  const fields = [
    {
      label: "Cache TTL — Analysis (ms)",
      id: "cache-ttl-analysis",
      value: config.cache?.ttl?.analysisMs || 3600000,
    },
    {
      label: "Cache TTL — Extract (ms)",
      id: "cache-ttl-extract",
      value: config.cache?.ttl?.extractMs || 3600000,
    },
    {
      label: "Retry Max Attempts",
      id: "retry-max-attempts",
      value: config.retry?.maxAttempts || 3,
    },
    {
      label: "Retry Initial Delay (ms)",
      id: "retry-initial-delay",
      value: config.retry?.initialDelayMs || 100,
    },
    {
      label: "Breaker Failure Threshold",
      id: "breaker-threshold",
      value: config.breaker?.failureThreshold || 5,
    },
  ];

  fields.forEach(({ label, id, value }) => {
    const fieldset = document.createElement("fieldset");
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    const input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.value = value;
    labelEl.appendChild(input);
    fieldset.appendChild(labelEl);
    form.appendChild(fieldset);
  });

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save Config";
  saveButton.onclick = async () => {
    const updatedConfig = {
      cache: {
        ttl: {
          analysisMs: Number(
            form.querySelector("#cache-ttl-analysis").value
          ),
          extractMs: Number(form.querySelector("#cache-ttl-extract").value),
        },
      },
      retry: {
        maxAttempts: Number(form.querySelector("#retry-max-attempts").value),
        initialDelayMs: Number(
          form.querySelector("#retry-initial-delay").value
        ),
      },
      breaker: {
        failureThreshold: Number(
          form.querySelector("#breaker-threshold").value
        ),
      },
    };
    try {
      await api.saveConfig(updatedConfig);
      alert("Config saved successfully");
    } catch (err) {
      alert(`Error saving config: ${err.message}`);
    }
  };

  form.appendChild(saveButton);
  container.appendChild(form);
  root.appendChild(container);
}

// ============================================================================
// src/operator-console/js/components/governance.js
// ============================================================================

export function renderGovernancePanel(root, state) {
  const { governance } = state.get();
  const container = document.createElement("div");
  container.className = "panel governance-panel";

  if (!governance) {
    container.innerHTML = "<p>No governance data yet.</p>";
    root.appendChild(container);
    return;
  }

  const title = document.createElement("h2");
  title.textContent = "Governance Status";
  container.appendChild(title);

  // Whitelist
  const whitelistSection = document.createElement("section");
  whitelistSection.innerHTML = `<h3>Artifact Whitelist (${governance.whitelistCount || 0}/12)</h3>`;
  const whitelistList = document.createElement("ul");
  (governance.whitelist || []).forEach((artifact) => {
    const li = document.createElement("li");
    li.textContent = `${artifact.name} (${artifact.tier})`;
    whitelistList.appendChild(li);
  });
  whitelistSection.appendChild(whitelistList);
  container.appendChild(whitelistSection);

  // Exceptions
  const exceptionSection = document.createElement("section");
  exceptionSection.innerHTML = `<h3>Exception Registry (${governance.exceptions?.length || 0})</h3>`;
  const exceptionList = document.createElement("ul");
  (governance.exceptions || []).forEach((exc) => {
    const li = document.createElement("li");
    li.textContent = `${exc.name} (sunset: ${exc.sunsetDate})`;
    exceptionList.appendChild(li);
  });
  exceptionSection.appendChild(exceptionList);
  container.appendChild(exceptionSection);

  // Drift
  const driftSection = document.createElement("section");
  driftSection.innerHTML = `<h3>RECLASSIFICATION.md Drift</h3>`;
  const driftPre = document.createElement("pre");
  driftPre.textContent = governance.drift || "No drift detected";
  driftSection.appendChild(driftPre);
  container.appendChild(driftSection);

  root.appendChild(container);
}
