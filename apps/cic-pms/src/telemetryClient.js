// telemetryClient.js - v1.0.0

import { recordModelCall } from "./telemetryCache.js";

const TELEMETRY_URL = process.env.ORCH_TELEMETRY_URL || process.env.PROMPT_TELEMETRY_URL || "http://localhost:4310";
const REGION = process.env.ORCH_REGION || process.env.PROCESS_REGION || "us-east";

async function post(path, body) {
  try {
    const { correlationId, ...rest } = body;
    await fetch(`${TELEMETRY_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        region: REGION, 
        correlationId: correlationId || null,
        ...rest 
      })
    });
  } catch {
    // best-effort, never throw
  }
}

export async function emitPackUsage({ pack, version }) {
  return post("/ingest/pack-usage", { pack, version });
}

export async function emitDrift(event) {
  return post("/ingest/drift", event);
}

export async function emitModelCall(event) {
  recordModelCall(event);
  return post("/ingest/model-call", event);
}

export async function emitPipeline(event) {
  return post("/ingest/pipeline", event);
}

export async function emitOverride(event) {
  return post("/ingest/override", event);
}

export async function emitPrpEvent(event) {
  return post("/ingest/prp", event);
}

export async function emitMASDecision(event) {
  return post("/ingest/mas_decision", event);
}

export async function emitMASSignal(event) {
  return post("/ingest/mas_signal", event);
}
