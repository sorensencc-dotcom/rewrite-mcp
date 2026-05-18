/**
 * Control Plane API Client — AD‑P v13
 * Origin auto‑discovery, failover, WS multiplexing, operator timeline,
 * replay engine, drift detection, and integrity envelopes.
 */

'use strict';

// ---------------------------------------------------------------------------
// ENVIRONMENT CHECKS
// ---------------------------------------------------------------------------
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------------------------------------------------------------------------
// INTEGRITY / BUILD STAMPS
// ---------------------------------------------------------------------------
const CP_UI_BUILD_STAMP = 'cp-ui-build:v13';
const CP_UI_PATCH_STAMP = 'cp-ui-adp:v13';

// ---------------------------------------------------------------------------
// BACKEND ORIGIN AUTO‑DISCOVERY + FAILOVER
// ---------------------------------------------------------------------------
const DEFAULT_BACKENDS = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

const OVERRIDE_BACKEND = (isBrowser && window.CONTROL_PLANE_BACKEND) || null;

const CANDIDATE_BACKENDS = [
  OVERRIDE_BACKEND,
  ...DEFAULT_BACKENDS,
].filter(Boolean);

let BACKEND_ORIGIN = null;

// ---------------------------------------------------------------------------
// HEALTH + VERSION PROBES
// ---------------------------------------------------------------------------
async function probeHealth(origin) {
  try {
    // Check if fetch exists (Node < 18 or specific environments might lack it)
    if (typeof fetch === 'undefined') return false;
    
    const res = await fetch(`${origin}/api/control-plane/healthz`, {
      method: 'GET',
      cache: 'no-store',
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function fetchVersion(origin) {
  try {
    if (typeof fetch === 'undefined') return null;
    const res = await fetch(`${origin}/api/control-plane/version`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch (_) {
    return null;
  }
}

function emit(name, detail) {
  if (!isBrowser) return;
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

// ---------------------------------------------------------------------------
// ORIGIN RESOLUTION
// ---------------------------------------------------------------------------
async function resolveBackend() {
  // Prevent resolution logic from running in non-browser environments during indexing
  if (!isBrowser) return null;

  for (const origin of CANDIDATE_BACKENDS) {
    if (!(await probeHealth(origin))) continue;

    BACKEND_ORIGIN = origin;
    console.log(`[CP-UI] Backend resolved: ${origin}`);

    const version = await fetchVersion(origin);
    if (version) {
      emit('cp-backend-version', {
        origin,
        version,
        uiBuild: CP_UI_BUILD_STAMP,
        uiPatch: CP_UI_PATCH_STAMP,
      });

      if (version.uiBuild && version.uiBuild !== CP_UI_BUILD_STAMP) {
        emit('cp-backend-drift', {
          origin,
          backendBuild: version.uiBuild,
          uiBuild: CP_UI_BUILD_STAMP,
        });
      }
    }
    return origin;
  }
  throw new Error('CP-UI: No reachable backend origin');
}

// Initialize the promise safely
const backendReady = isBrowser ? resolveBackend() : Promise.resolve(null);

// ---------------------------------------------------------------------------
// OPERATOR EVENT TIMELINE (OET) v13
// ---------------------------------------------------------------------------
const TIMELINE_LIMIT = 2000;
let seqCounter = 1;
const timeline = [];

function pushTimeline(evt) {
  evt.seq = seqCounter++;
  evt.ts = evt.ts || Date.now();
  timeline.push(evt);
  if (timeline.length > TIMELINE_LIMIT) timeline.shift();
  emit('cp-event', evt);
}

const timelineAPI = {
  all: () => [...timeline],
  since: (ts) => timeline.filter(e => e.ts >= ts),
  until: (ts) => timeline.filter(e => e.ts <= ts),
  range: (a, b) => timeline.filter(e => e.ts >= a && e.ts <= b),
  types: (t) => timeline.filter(e => e.type === t),
  replay: ({ since = 0, until = Infinity, types = null } = {}) => {
    const events = timeline.filter(e =>
      e.ts >= since &&
      e.ts <= until &&
      (!types || types.includes(e.type))
    );
    for (const e of events) emit('cp-event', e);
  }
};

// ---------------------------------------------------------------------------
// WEBSOCKET MULTIPLEXING v13
// ---------------------------------------------------------------------------
let ws = null;
let wsReconnectTimer = null;

async function connectWebSocket() {
  if (!isBrowser || typeof WebSocket === 'undefined') return;

  await backendReady;
  if (!BACKEND_ORIGIN) return;

  const wsUrl = BACKEND_ORIGIN.replace(/^http/, 'ws') + '/api/control-plane/ws';
  
  if (ws) {
    try { ws.close(); } catch (_) {}
    ws = null;
  }

  console.log('[CP-UI] WS connecting:', wsUrl);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    pushTimeline({
      type: 'system.ws.connected',
      source: 'ui',
      payload: { url: wsUrl },
      integrity: {
        uiBuild: CP_UI_BUILD_STAMP,
        uiPatch: CP_UI_PATCH_STAMP,
      }
    });
  };

  ws.onclose = () => {
    pushTimeline({
      type: 'system.ws.disconnected',
      source: 'ui',
      payload: { url: wsUrl },
    });
    if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
    wsReconnectTimer = setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = (err) => {
    pushTimeline({
      type: 'system.ws.error',
      source: 'ui',
      payload: { error: err.message },
    });
  };

  ws.onmessage = (msg) => {
    try {
      const evt = JSON.parse(msg.data);
      pushTimeline({
        type: evt.type || 'unknown',
        source: evt.source || 'backend',
        payload: evt.payload || evt,
        integrity: {
          uiBuild: CP_UI_BUILD_STAMP,
          uiPatch: CP_UI_PATCH_STAMP,
          backendBuild: evt.backendBuild || null,
        }
      });
    } catch (e) {
      pushTimeline({
        type: 'system.ws.parse_error',
        source: 'ui',
        payload: { error: e.message },
      });
    }
  };
}

// ---------------------------------------------------------------------------
// AUTO-INITIALIZE ONLY IN BROWSER
// ---------------------------------------------------------------------------
if (isBrowser) {
  connectWebSocket();
}

// ---------------------------------------------------------------------------
// API BASE
// ---------------------------------------------------------------------------
async function apiBase() {
  await backendReady;
  return `${BACKEND_ORIGIN}/api/control-plane`;
}

// ---------------------------------------------------------------------------
// REQUEST WRAPPER
// ---------------------------------------------------------------------------
async function request(path, options = {}) {
  const BASE = await apiBase();
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
  } catch (networkErr) {
    pushTimeline({
      type: 'system.network.error',
      source: 'ui',
      payload: { url, error: networkErr.message },
    });
    throw new Error(`CP_NETWORK_ERROR [${url}]: ${networkErr.message}`);
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch (_) {}
    pushTimeline({
      type: 'system.api.error',
      source: 'ui',
      payload: { url, status: res.status, body },
    });
    throw new Error(`CP_API_ERROR ${res.status} [${url}]: ${body}`);
  }

  const envelope = await res.json();
  pushTimeline({
    type: 'system.api.success',
    source: 'ui',
    payload: { url, envelope },
  });
  return envelope;
}

// ---------------------------------------------------------------------------
// INTERNALS EXPORT
// ---------------------------------------------------------------------------
export const __cpInternals = {
  backendReady,
  getBackendOrigin: () => BACKEND_ORIGIN,
  buildStamp: CP_UI_BUILD_STAMP,
  patchStamp: CP_UI_PATCH_STAMP,
  timeline: timelineAPI,
};

// ---------------------------------------------------------------------------
// PUBLIC API FUNCTIONS
// Contract: all return the full response envelope { requestId, timestamp, source, data }
// Panels must not call fetch() directly — always go through these.
// ---------------------------------------------------------------------------

/** GET /pipelines → envelope.data = Pipeline[] */
export async function listPipelines() {
  return request('/pipelines');
}

/** GET /pipelines/:id → envelope.data = Pipeline */
export async function getPipeline(id) {
  return request(`/pipelines/${encodeURIComponent(id)}`);
}

/** GET /agents → envelope.data = Agent[] */
export async function listAgents() {
  return request('/agents');
}

/** GET /agents/:id → envelope.data = Agent */
export async function getAgent(id) {
  return request(`/agents/${encodeURIComponent(id)}`);
}

/**
 * GET /runs?pipelineId=&status=&window= → envelope.data = Run[]
 * @param {{ pipelineId?: string, status?: string, window?: string }} filters
 */
export async function listRuns(filters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ''))
  );
  const qs = params.size ? `?${params}` : '';
  return request(`/runs${qs}`);
}

/** GET /runs/:id → envelope.data = Run */
export async function getRun(id) {
  return request(`/runs/${encodeURIComponent(id)}`);
}

/**
 * GET /metrics?pipelineId=&agentId=&window= → envelope.data = MetricSeries[]
 * @param {{ pipelineId?: string, agentId?: string, window?: string }} filters
 */
export async function listMetrics(filters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== ''))
  );
  const qs = params.size ? `?${params}` : '';
  return request(`/metrics${qs}`);
}

/**
 * POST /pipelines/:id/runs → envelope.data = { runId, pipelineId, status, startedAt }
 * Only mutating endpoint. Triggers a pipeline run (fire-and-forget on server).
 * @param {string} id
 * @param {Object} [payload={}]
 */
export async function triggerPipeline(id, payload = {}) {
  return request(`/pipelines/${encodeURIComponent(id)}/runs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
