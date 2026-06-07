// File: projects/cic/ingestion/src/lib/llmClientWithHeadroom.js | Date: 2026-06-04 | v1.1.0

import { headroomCompressMessages } from "./headroomClient.js";
import { chat as baseChat } from "./llmClient.js";
import { recordProxyLatency, recordAuthFailure, recordError } from "./headroomTelemetry.js";
import { performance } from "node:perf_hooks";
import { shouldBypassHeadroomForRun } from "./headroomAutotune.js";
import { shouldBypassByPolicy } from "./headroomPolicyEngine.js";

function getEnvConfig() {
  const HEADROOM_ENABLED =
    (process.env.HEADROOM_ENABLED ?? "true").toLowerCase() === "true";

  const HEADROOM_PROXY_URL =
    process.env.HEADROOM_PROXY_URL ?? "http://localhost:8787/v1/chat/completions";

  const ON_AUTH_FAILURE =
    (process.env.HEADROOM_ON_AUTH_FAILURE ?? "bypass").toLowerCase();

  return {
    HEADROOM_ENABLED,
    HEADROOM_PROXY_URL,
    ON_AUTH_FAILURE
  };
}

function isAuthError(e) {
  if (!e) return false;
  const anyErr = e;
  const code = anyErr.statusCode ?? anyErr.code ?? anyErr.status;
  if (typeof code === "number" && (code === 401 || code === 403)) return true;
  const msg = String(anyErr.message ?? "").toLowerCase();
  if (msg.includes("unauthorized") || msg.includes("forbidden")) return true;
  return false;
}

// Optional: direct call via Headroom proxy (if you want proxy-level compression)
async function callViaHeadroomProxy(messages, options = {}) {
  const config = getEnvConfig();
  const body = {
    model: options.model ?? "default",
    messages,
    ...options
  };

  const t0p = performance.now();
  try {
    const res = await fetch(config.HEADROOM_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HEADROOM_API_KEY
          ? { Authorization: `Bearer ${process.env.HEADROOM_API_KEY}` }
          : {})
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(
        `Headroom proxy error: ${res.status} ${res.statusText}`
      );
      err.statusCode = res.status;
      err.body = text;
      throw err;
    }

    recordProxyLatency(performance.now() - t0p);
    return res.json();
  } catch (e) {
    recordError(e);
    if (isAuthError(e)) {
      recordAuthFailure();
    }
    throw e;
  }
}

export async function chatWithHeadroom(messages, options = {}) {
  const config = getEnvConfig();

  if (!config.HEADROOM_ENABLED || shouldBypassHeadroomForRun() || shouldBypassByPolicy()) {
    return baseChat(messages, options);
  }

  // First, try MCP-based compression
  let compressedMessages = messages;
  try {
    compressedMessages = await headroomCompressMessages(messages);
  } catch (e) {
    // headroomCompressMessages already applied fallback logic
    compressedMessages = messages;
  }

  // Default: use base LLM client with compressed messages
  try {
    const t0p = performance.now();
    const out = await baseChat(compressedMessages, options);
    recordProxyLatency(performance.now() - t0p);
    return out;
  } catch (e) {
    recordError(e);
    if (isAuthError(e) && config.ON_AUTH_FAILURE === "bypass") {
      recordAuthFailure();
      return baseChat(messages, options);
    }
    throw e;
  }
}
export { callViaHeadroomProxy };

