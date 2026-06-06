# PHASE F COMPONENT-BY-COMPONENT IMPLEMENTATION GUIDE
*(Every component, what it does, how to build it, and integration points)*

Phase F has **10 core components**, each isolated, deterministic, and dependency-free.

---

## 1. app.js — Root Orchestrator

**Purpose:**
- Bootstraps the console
- Initializes router
- Starts polling/WebSocket streams
- Manages global state

**Implementation:**
```javascript
// src/operator-console/js/app.js
class ConsoleApp {
  constructor(config) {
    this.config = config;
    this.state = {};
    this.components = {};
  }

  async init() {
    // Load initial config
    this.config = await this.api.fetchJSON('/api/config');
    
    // Initialize state
    this.state = {
      pipeline: null,
      mcp: {},
      traces: [],
      governance: {}
    };
    
    // Mount root
    this.mount();
    
    // Start polling
    this.startPolling();
  }

  mount() {
    const root = document.getElementById('app');
    root.innerHTML = this.render();
  }

  startPolling() {
    setInterval(() => this.pollData(), 1000);
  }

  async pollData() {
    const [pipeline, mcp, traces, governance] = await Promise.all([
      this.api.fetchJSON('/api/pipeline'),
      this.api.fetchJSON('/api/mcp/health'),
      this.api.fetchJSON('/api/traces?limit=10'),
      this.api.fetchJSON('/api/governance')
    ]);

    this.updateState({ pipeline, mcp, traces, governance });
    this.render();
  }

  updateState(partial) {
    this.state = { ...this.state, ...partial };
  }

  render() {
    return `
      <div id="console-root">
        <header>${this.renderHeader()}</header>
        <div id="nav-sidebar">${this.renderNav()}</div>
        <div id="panels">${this.renderCurrentPanel()}</div>
      </div>
    `;
  }

  renderHeader() {
    return `
      <h1>CIC Operator Console</h1>
      <div class="status">
        <span>${this.state.pipeline?.status || 'IDLE'}</span>
      </div>
    `;
  }

  renderNav() {
    return `
      <nav>
        <a href="#pipeline">Pipeline</a>
        <a href="#mcp">MCP Health</a>
        <a href="#timeline">Timeline</a>
        <a href="#traces">Traces</a>
        <a href="#config">Config</a>
        <a href="#governance">Governance</a>
      </nav>
    `;
  }

  renderCurrentPanel() {
    const hash = window.location.hash.slice(1) || 'pipeline';
    const component = this.components[hash];
    return component ? component.render(this.state) : '';
  }
}

// Bootstrap
const app = new ConsoleApp();
app.init();
```

**Integration Points:**
- Reads from `/api/metrics`, `/api/traces`, `/api/pipeline`
- Emits state updates to all components
- Handles WebSocket for live updates

---

## 2. router.js — Panel Router

**Purpose:**
- Maps URL hash → component
- Handles navigation
- Prevents state loss

**Implementation:**
```javascript
// src/operator-console/js/router.js
class Router {
  constructor(app) {
    this.app = app;
    this.routes = {
      'pipeline': new PipelinePanel(app),
      'mcp': new MCPHealthGrid(app),
      'timeline': new ExecutionTimeline(app),
      'traces': new TraceListPanel(app),
      'trace-view': new TraceViewPanel(app),
      'config': new ConfigEditor(app),
      'governance': new GovernancePanel(app)
    };

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'pipeline';
    const component = this.routes[hash];
    if (component) {
      this.app.currentComponent = component;
      this.app.render();
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}
```

---

## 3. state.js — Global State Store

**Purpose:**
- Holds live pipeline state
- Holds MCP server health
- Holds trace metadata
- Enables component communication

**Implementation:**
```javascript
// src/operator-console/js/state.js
class StateStore {
  constructor() {
    this.data = {
      pipeline: null,
      mcp: {},
      traces: [],
      governance: {},
      config: {}
    };
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  update(partial) {
    this.data = { ...this.data, ...partial };
    this.notifySubscribers();
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.data));
  }

  get(key) {
    return this.data[key];
  }
}
```

---

## 4. api.js — Data Layer

**Purpose:**
- Fetch metrics, traces, pipeline state
- WebSocket for live updates
- Retry + error handling

**Implementation:**
```javascript
// src/operator-console/js/api.js
class API {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.ws = null;
  }

  async fetchJSON(url, options = {}) {
    try {
      const response = await fetch(this.baseUrl + url, {
        headers: { 'Authorization': `Bearer ${this.getAdminToken()}` },
        ...options
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`API error: ${url}`, err);
      throw err;
    }
  }

  subscribe(channel, callback) {
    if (!this.ws) {
      this.ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
      );
    }

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.channel === channel) {
        callback(data.payload);
      }
    });
  }

  getAdminToken() {
    return localStorage.getItem('admin_token') || '';
  }

  setAdminToken(token) {
    localStorage.setItem('admin_token', token);
  }
}
```

---

## 5. Pipeline Live View (pipeline.js)

**Purpose:**
- Real-time stage table
- Retry/breaker/cache indicators
- Latency bars

**Implementation:**
```javascript
// src/operator-console/js/components/pipeline.js
class PipelinePanel {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const pipeline = state.pipeline || { stages: [] };

    return `
      <div class="panel pipeline-panel">
        <h2>CIC Main Pipeline — Live Execution</h2>
        <table class="stages-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Retries</th>
              <th>Cache</th>
            </tr>
          </thead>
          <tbody>
            ${pipeline.stages.map(stage => this.renderStage(stage)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderStage(stage) {
    const statusClass = stage.status.toLowerCase();
    const latencyBar = this.renderLatencyBar(stage.latencyMs);

    return `
      <tr class="stage-row ${statusClass}">
        <td>${stage.name}</td>
        <td class="status">${stage.status}</td>
        <td>${latencyBar}</td>
        <td>${stage.retryCount}</td>
        <td>${stage.cacheHit ? 'HIT' : 'MISS'}</td>
      </tr>
    `;
  }

  renderLatencyBar(latencyMs) {
    const maxLatency = 5000;
    const percentage = Math.min(100, (latencyMs / maxLatency) * 100);

    return `
      <div class="latency-bar">
        <div class="latency-fill" style="width: ${percentage}%"></div>
        <span>${latencyMs}ms</span>
      </div>
    `;
  }
}
```

---

## 6. MCP Health Grid (mcpGrid.js)

**Purpose:**
- Show health of 5 MCP servers
- Latency sparkline
- Version drift

**Implementation:**
```javascript
// src/operator-console/js/components/mcpGrid.js
class MCPHealthGrid {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const mcp = state.mcp || {};

    return `
      <div class="panel mcp-grid-panel">
        <h2>MCP Server Health (7070-7074)</h2>
        <div class="mcp-grid">
          ${[7070, 7071, 7072, 7073, 7074]
            .map(port => this.renderServer(mcp[port] || {}))
            .join('')}
        </div>
      </div>
    `;
  }

  renderServer(server) {
    const status = server.healthy ? 'UP' : 'DOWN';
    const statusClass = server.healthy ? 'healthy' : 'down';

    return `
      <div class="mcp-card ${statusClass}">
        <h3>Port ${server.port}</h3>
        <div class="status">${status}</div>
        <div class="latency">${server.latencyMs || 0}ms</div>
        <div class="error-rate">${(server.errorRate || 0).toFixed(2)}%</div>
        <div class="version">${server.version || 'unknown'}</div>
        <canvas class="sparkline" width="100" height="30"></canvas>
      </div>
    `;
  }
}
```

---

## 7. Execution Timeline (timeline.js)

**Purpose:**
- Gantt-style visualization
- Multi-instance execution
- Parallel stage rendering

**Implementation:**
```javascript
// src/operator-console/js/components/timeline.js
class ExecutionTimeline {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const traces = state.traces || [];

    return `
      <div class="panel timeline-panel">
        <h2>Execution Timeline</h2>
        <svg class="timeline-svg" width="100%" height="400">
          ${traces.map((trace, idx) => this.renderTrace(trace, idx)).join('')}
        </svg>
      </div>
    `;
  }

  renderTrace(trace, idx) {
    const y = idx * 50;
    const spans = trace.spans || [];

    return `
      <g class="trace" transform="translate(0, ${y})">
        ${spans.map(span => this.renderSpan(span)).join('')}
      </g>
    `;
  }

  renderSpan(span) {
    const x = span.startTime % 1000;
    const width = span.durationMs;
    const color = span.status === 'ok' ? 'green' : 'red';

    return `
      <rect x="${x}" y="0" width="${width}" height="40" 
            fill="${color}" opacity="0.7" title="${span.name}"></rect>
    `;
  }
}
```

---

## 8. Trace Explorer (traceList.js + traceView.js)

**Purpose:**
- List traces
- Waterfall view
- Flamegraph view
- Span detail drawer

**Implementation:**
```javascript
// src/operator-console/js/components/traceList.js
class TraceListPanel {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const traces = state.traces || [];

    return `
      <div class="panel trace-list-panel">
        <h2>Trace Explorer</h2>
        <div class="trace-list">
          ${traces.map(trace => this.renderTraceRow(trace)).join('')}
        </div>
      </div>
    `;
  }

  renderTraceRow(trace) {
    const spanCount = trace.spans?.length || 0;
    const hasError = trace.spans?.some(s => s.status === 'error');

    return `
      <div class="trace-row ${hasError ? 'error' : 'success'}" 
           onclick="window.location.hash='trace-view?id=${trace.traceId}'">
        <span class="trace-id">${trace.traceId}</span>
        <span class="duration">${trace.durationMs}ms</span>
        <span class="spans">${spanCount} spans</span>
      </div>
    `;
  }
}

// src/operator-console/js/components/traceView.js
class TraceViewPanel {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const trace = state.currentTrace || {};
    const spans = trace.spans || [];

    return `
      <div class="panel trace-view-panel">
        <h2>Trace: ${trace.traceId}</h2>
        <div class="trace-controls">
          <button onclick="this.toggleWaterfall()">Waterfall</button>
          <button onclick="this.toggleFlamegraph()">Flamegraph</button>
        </div>
        <div class="waterfall">
          ${this.renderWaterfall(spans)}
        </div>
      </div>
    `;
  }

  renderWaterfall(spans) {
    const rootSpans = spans.filter(s => !s.parentSpanId);

    return rootSpans.map(span => this.renderSpanTree(span, spans, 0)).join('');
  }

  renderSpanTree(span, allSpans, depth) {
    const indent = depth * 20;
    const children = allSpans.filter(s => s.parentSpanId === span.spanId);

    return `
      <div class="span-node" style="margin-left: ${indent}px">
        <div class="span-header" onclick="this.toggleChildren()">
          <span class="span-name">${span.name}</span>
          <span class="span-latency">${span.durationMs}ms</span>
        </div>
        <div class="span-children">
          ${children.map(child => this.renderSpanTree(child, allSpans, depth + 1)).join('')}
        </div>
      </div>
    `;
  }
}
```

---

## 9. Trace Diffing (traceDiff.js)

**Purpose:**
- Compare two traces
- Highlight deltas
- Show before/after

**Implementation:**
```javascript
// src/operator-console/js/components/traceDiff.js
class TraceDiffPanel {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const traces = state.traces || [];

    return `
      <div class="panel trace-diff-panel">
        <h2>Trace Diffing</h2>
        <div class="diff-controls">
          <select id="trace-1">
            ${traces.map(t => `<option value="${t.traceId}">${t.traceId}</option>`).join('')}
          </select>
          <span>vs</span>
          <select id="trace-2">
            ${traces.map(t => `<option value="${t.traceId}">${t.traceId}</option>`).join('')}
          </select>
          <button onclick="this.computeDiff()">Diff</button>
        </div>
        <div id="diff-result"></div>
      </div>
    `;
  }

  computeDiff() {
    const trace1Id = document.getElementById('trace-1').value;
    const trace2Id = document.getElementById('trace-2').value;
    // Compute diff and render
  }
}
```

---

## 10. Config Editor + Governance Panel

**Purpose:**
- Edit TTLs, retry policies, breaker thresholds
- View whitelist + exceptions
- Detect drift in RECLASSIFICATION.md

**Implementation:**
```javascript
// src/operator-console/js/components/configEditor.js
class ConfigEditor {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const config = state.config || {};

    return `
      <div class="panel config-editor-panel">
        <h2>Configuration Editor</h2>
        <form onsubmit="this.saveConfig(event)">
          <fieldset>
            <legend>Cache TTLs (ms)</legend>
            <input type="number" name="cache.ttl.analyze" value="${config.cache?.ttl?.analyze || 3600000}">
            <input type="number" name="cache.ttl.extract" value="${config.cache?.ttl?.extract || 3600000}">
          </fieldset>
          <fieldset>
            <legend>Retry Policy</legend>
            <input type="number" name="retry.maxAttempts" value="${config.retry?.maxAttempts || 3}">
            <input type="number" name="retry.initialDelayMs" value="${config.retry?.initialDelayMs || 100}">
          </fieldset>
          <fieldset>
            <legend>Circuit Breaker</legend>
            <input type="number" name="breaker.failureThreshold" value="${config.breaker?.failureThreshold || 5}">
            <input type="number" name="breaker.cooldownMs" value="${config.breaker?.cooldownMs || 30000}">
          </fieldset>
          <button type="submit">Save Config</button>
        </form>
      </div>
    `;
  }

  async saveConfig(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const config = Object.fromEntries(formData);
    await this.app.api.fetchJSON('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// src/operator-console/js/components/governance.js
class GovernancePanel {
  constructor(app) {
    this.app = app;
  }

  render(state) {
    const governance = state.governance || {};

    return `
      <div class="panel governance-panel">
        <h2>Governance Status</h2>
        <div class="whitelist-viewer">
          <h3>Artifact Whitelist (${governance.whitelistCount || 0}/12)</h3>
          <ul>
            ${(governance.whitelist || []).map(a => `<li>${a.name} (${a.tier})</li>`).join('')}
          </ul>
        </div>
        <div class="exception-registry">
          <h3>Exception Registry (${governance.exceptions?.length || 0})</h3>
          <ul>
            ${(governance.exceptions || []).map(e => `<li>${e.name} (sunset: ${e.sunsetDate})</li>`).join('')}
          </ul>
        </div>
        <div class="drift-detector">
          <h3>RECLASSIFICATION.md Drift</h3>
          <pre>${governance.drift || 'No drift detected'}</pre>
        </div>
      </div>
    `;
  }
}
```

---

## Component Integration Points

| Component | API Reads | API Writes | Subscribes To |
|-----------|-----------|-----------|---------------|
| Pipeline | `/api/pipeline` | — | `state.pipeline` |
| MCP Grid | `/api/mcp/health` | — | `state.mcp` |
| Timeline | `/api/traces` | — | `state.traces` |
| Trace List | `/api/traces` | — | `state.traces` |
| Trace View | `/api/traces/{id}` | — | `state.currentTrace` |
| Trace Diff | `/api/traces` | — | `state.traces` |
| Config Editor | `/api/config` | `POST /api/config` | `state.config` |
| Governance | `/api/governance` | — | `state.governance` |

---

## Testing Strategy

Each component tested independently:
- `tests/console/PipelinePanel.test.js`
- `tests/console/MCPHealthGrid.test.js`
- `tests/console/TraceExplorer.test.js`
- `tests/console/ConfigEditor.test.js`
- `tests/console/GovernancePanel.test.js`

**Coverage target:** 90%+ for all components
