// server.js - v1.1.0

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[telemetry] ${req.method} ${req.url}`);
  next();
});

// Serve the dashboard at the root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

const state = {
  packs: {},              // { packName: { version, count } }
  driftEvents: [],        // [{ id, correlationId, pack, version, expectedHash, actualHash, subsystem, ts }]
  modelCalls: [],         // [{ id, correlationId, model, subsystem, pack, latencyMs, success, ts }]
  pipelines: [],          // [{ id, correlationId, jobId, pipeline, packs, ts }]
  overrides: [],
  prpEvents: [],
  masDecisions: [],       // [{ id, correlationId, agent, directive, reason, ts }]
  masSignals: [],         // [{ id, correlationId, agent, drift, confidence, ts }]
  masRerunAttempts: [],   // [{ id, correlationId, agent, attempt, maxAttempts, backoffMs, reason, ts }]
  masRerunBackoffs: [],   // [{ id, correlationId, agent, attempt, backoffMs, ts }]
  masRerunFinalStates: [] // [{ id, correlationId, agent, finalState, attempts, maxAttempts, ts }]
};

function now() {
  return new Date().toISOString();
}

function recordPackUsage({ pack, version, correlationId }) {
  if (!state.packs[pack]) {
    state.packs[pack] = { version, count: 0 };
  }
  state.packs[pack].version = version;
  state.packs[pack].count += 1;
}

function recordDrift(event) {
  state.driftEvents.push({ ...event, id: randomUUID(), ts: now() });
  if (state.driftEvents.length > 500) state.driftEvents.shift();
}

function recordModelCall(event) {
  state.modelCalls.push({ ...event, id: randomUUID(), ts: now() });
  if (state.modelCalls.length > 1000) state.modelCalls.shift();
}

function recordPipeline(event) {
  state.pipelines.push({ ...event, id: randomUUID(), ts: now() });
  if (state.pipelines.length > 500) state.pipelines.shift();
}

// ingest endpoints
app.post("/ingest/pack-usage", (req, res) => {
  console.log(`[telemetry] INGEST pack-usage: ${req.body?.pack}`);
  const { pack, version, correlationId } = req.body || {};
  if (!pack || !version) return res.status(400).json({ error: "pack and version required" });
  recordPackUsage({ pack, version, correlationId });
  res.json({ ok: true });
});

app.post("/ingest/drift", (req, res) => {
  console.log(`[telemetry] INGEST drift: ${req.body?.pack}`);
  const { pack, version, expectedHash, actualHash, subsystem, correlationId } = req.body || {};
  if (!pack || !version) return res.status(400).json({ error: "pack and version required" });
  recordDrift({ pack, version, expectedHash, actualHash, subsystem, correlationId });
  res.json({ ok: true });
});

app.post("/ingest/model-call", (req, res) => {
  console.log(`[telemetry] INGEST model-call: ${req.body?.model}`);
  const { model, subsystem, pack, latencyMs, success, correlationId } = req.body || {};
  if (!model || !subsystem) return res.status(400).json({ error: "model and subsystem required" });
  recordModelCall({ model, subsystem, pack, latencyMs, success: !!success, correlationId });
  res.json({ ok: true });
});

app.post("/ingest/pipeline", (req, res) => {
  console.log(`[telemetry] INGEST pipeline: ${req.body?.jobId}`);
  const { jobId, pipeline, packs, correlationId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: "jobId required" });
  recordPipeline({ jobId, pipeline, packs, correlationId });
  res.json({ ok: true });
});

// NEW: ingest override + prp events
app.post("/ingest/override", (req, res) => {
  const { region, agent, action, subsystem, correlationId } = req.body || {};
  if (!agent || !action) return res.status(400).json({ error: "agent and action required" });
  state.overrides.push({
    id: randomUUID(),
    correlationId: correlationId || null,
    ts: now(),
    type: "override",
    region: region || "global",
    agent,
    action,
    subsystem: subsystem || null
  });
  if (state.overrides.length > 500) state.overrides.shift();
  res.json({ ok: true });
});

app.post("/ingest/prp", (req, res) => {
  const { region, pack, version, action, correlationId } = req.body || {};
  if (!pack || !version || !action) return res.status(400).json({ error: "pack, version, action required" });
  state.prpEvents.push({
    id: randomUUID(),
    correlationId: correlationId || null,
    ts: now(),
    type: "prp",
    region: region || "global",
    pack,
    version,
    action
  });
  if (state.prpEvents.length > 500) state.prpEvents.shift();
  res.json({ ok: true });
});

app.post("/ingest/mas_decision", (req, res) => {
  const { correlationId, agent, directive, reason, drift, confidence, region } = req.body || {};
  if (!agent || !directive) return res.status(400).json({ error: "agent and directive required" });
  state.masDecisions.push({
    id: randomUUID(), correlationId: correlationId || null, ts: now(),
    type: "mas_decision", region: region || "global",
    agent, directive, reason, drift, confidence
  });
  if (state.masDecisions.length > 500) state.masDecisions.shift();
  res.json({ ok: true });
});

app.post("/ingest/mas_signal", (req, res) => {
  const { correlationId, agent, drift, confidence, region } = req.body || {};
  if (!agent) return res.status(400).json({ error: "agent required" });
  state.masSignals.push({
    id: randomUUID(), correlationId: correlationId || null, ts: now(),
    type: "mas_signal", region: region || "global",
    agent, drift, confidence
  });
  if (state.masSignals.length > 500) state.masSignals.shift();
  res.json({ ok: true });
});

// telemetry endpoints
app.get("/telemetry/packs", (req, res) => {
  res.json(state.packs);
});

app.get("/telemetry/drift", (req, res) => {
  res.json(state.driftEvents.slice(-200).reverse());
});

app.get("/telemetry/model-calls", (req, res) => {
  res.json(state.modelCalls.slice(-500).reverse());
});

app.get("/telemetry/pipelines", (req, res) => {
  res.json(state.pipelines.slice(-200).reverse());
});

app.post("/ingest/mas_rerun_attempt", (req, res) => {
  const { correlationId, agent, attempt, maxAttempts, backoffMs, reason, region } = req.body || {};
  if (!agent || !attempt) return res.status(400).json({ error: "agent and attempt required" });
  state.masRerunAttempts.push({
    id: randomUUID(), correlationId: correlationId || null, ts: now(),
    type: "mas_rerun_attempt", region: region || "global",
    agent, attempt, maxAttempts, backoffMs, reason
  });
  if (state.masRerunAttempts.length > 500) state.masRerunAttempts.shift();
  res.json({ ok: true });
});

app.post("/ingest/mas_rerun_backoff", (req, res) => {
  const { correlationId, agent, attempt, backoffMs, region } = req.body || {};
  if (!agent || !attempt) return res.status(400).json({ error: "agent and attempt required" });
  state.masRerunBackoffs.push({
    id: randomUUID(), correlationId: correlationId || null, ts: now(),
    type: "mas_rerun_backoff", region: region || "global",
    agent, attempt, backoffMs
  });
  if (state.masRerunBackoffs.length > 500) state.masRerunBackoffs.shift();
  res.json({ ok: true });
});

app.post("/ingest/mas_rerun_final_state", (req, res) => {
  const { correlationId, agent, finalState, attempts, maxAttempts, region } = req.body || {};
  if (!agent || !finalState) return res.status(400).json({ error: "agent and finalState required" });
  state.masRerunFinalStates.push({
    id: randomUUID(), correlationId: correlationId || null, ts: now(),
    type: "mas_rerun_final_state", region: region || "global",
    agent, finalState, attempts, maxAttempts
  });
  if (state.masRerunFinalStates.length > 500) state.masRerunFinalStates.shift();
  res.json({ ok: true });
});

// NEW: timeline endpoint
app.get("/telemetry/timeline", (req, res) => {
  const events = [];

  state.modelCalls.forEach(e =>
    events.push({
      id: e.id,
      correlationId: e.correlationId,
      ts: e.ts,
      type: "model_call",
      region: e.region || "global",
      subsystem: e.subsystem,
      pack: e.pack,
      version: null,
      agent: null,
      jobId: null,
      action: null,
      meta: { latencyMs: e.latencyMs, success: e.success, model: e.model }
    })
  );

  state.driftEvents.forEach(e =>
    events.push({
      id: e.id,
      correlationId: e.correlationId,
      ts: e.ts,
      type: "drift",
      region: e.region || "global",
      subsystem: e.subsystem,
      pack: e.pack,
      version: e.version,
      agent: null,
      jobId: null,
      action: null,
      meta: { expectedHash: e.expectedHash, actualHash: e.actualHash }
    })
  );

  state.pipelines.forEach(e =>
    events.push({
      id: e.id,
      correlationId: e.correlationId,
      ts: e.ts,
      type: "pipeline",
      region: e.region || "global",
      subsystem: null,
      pack: null,
      version: null,
      agent: null,
      jobId: e.jobId,
      action: null,
      meta: { pipeline: e.pipeline, packs: e.packs }
    })
  );

  state.overrides.forEach(e => events.push(e));
  state.prpEvents.forEach(e => events.push(e));
  state.masDecisions.forEach(e => events.push(e));
  state.masSignals.forEach(e => events.push(e));
  state.masRerunAttempts.forEach(e => events.push(e));
  state.masRerunBackoffs.forEach(e => events.push(e));
  state.masRerunFinalStates.forEach(e => events.push(e));

  events.sort((a, b) => (a.ts < b.ts ? 1 : -1)); // newest first
  res.json(events.slice(0, 200));
});

// NEW: trace endpoint for Waterfall visualization
app.get("/telemetry/trace/:correlationId", (req, res) => {
  const cid = req.params.correlationId;
  const events = [];

  const filter = (e) => e.correlationId === cid;

  state.modelCalls.filter(filter).forEach(e => events.push({ ...e, type: "model_call" }));
  state.driftEvents.filter(filter).forEach(e => events.push({ ...e, type: "drift" }));
  state.pipelines.filter(filter).forEach(e => events.push({ ...e, type: "pipeline" }));
  state.overrides.filter(filter).forEach(e => events.push({ ...e, type: "override" }));
  state.prpEvents.filter(filter).forEach(e => events.push({ ...e, type: "prp" }));
  state.masDecisions.filter(filter).forEach(e => events.push({ ...e, type: "mas_decision" }));
  state.masSignals.filter(filter).forEach(e => events.push({ ...e, type: "mas_signal" }));
  state.masRerunAttempts.filter(filter).forEach(e => events.push(e));
  state.masRerunBackoffs.filter(filter).forEach(e => events.push(e));
  state.masRerunFinalStates.filter(filter).forEach(e => events.push(e));

  events.sort((a, b) => (a.ts < b.ts ? -1 : 1)); // oldest first for waterfall
  res.json(events);
});

const PORT = process.env.PROMPT_TELEMETRY_PORT || 4310;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[prompt-telemetry] listening on 0.0.0.0:${PORT}`);
});
