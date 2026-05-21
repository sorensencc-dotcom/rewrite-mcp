// filename: synergyAnalyzer.js
// semver: 1.0.0
// date: 2026-05-20
// MAS Phase 1 — Synergy Analyzer Operationalization
// Rewrite Labs Operator-Grade Standard (Node 20+, ESM, deterministic)

import { createHash } from 'crypto';

/**
 * MAS Signal Model
 * All agents emit telemetry packets. synergyAnalyzer consumes them and
 * produces routing directives for the orchestrator.
 *
 * Input shape:
 * {
 *   agent: "INGEST" | "ENRICH" | "ORCHESTRATE" | "SYNTHESIZE" | "AUDIT",
 *   latencyMs: number,
 *   confidence: number,        // 0.0 - 1.0
 *   drift: number,             // 0.0 - 1.0
 *   errors: number,
 *   queueDepth: number,
 *   timestamp: number
 * }
 */

const AGENTS = ["INGEST", "ENRICH", "ORCHESTRATE", "SYNTHESIZE", "AUDIT"];

function validatePacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new Error("synergyAnalyzer: invalid packet (not an object)");
  }
  if (!AGENTS.includes(packet.agent)) {
    throw new Error(`synergyAnalyzer: invalid agent '${packet.agent}'`);
  }
  const numericFields = ["latencyMs", "confidence", "drift", "errors", "queueDepth", "timestamp"];
  for (const f of numericFields) {
    if (typeof packet[f] !== "number" || Number.isNaN(packet[f])) {
      throw new Error(`synergyAnalyzer: invalid numeric field '${f}'`);
    }
  }
}

/**
 * MAS Decision Engine
 * Produces routing directives:
 *  - skipAgent
 *  - rerunAgent
 *  - fallbackAgent
 *  - parallelizeAgents
 *  - speculativeRun
 */

function computeDirective(packet) {
  const { agent, latencyMs, confidence, drift, errors, queueDepth } = packet;

  // High drift → re-run enrichment or orchestrator
  if (drift > 0.35) {
    return {
      action: "rerunAgent",
      target: agent,
      reason: "high_drift"
    };
  }

  // Low confidence → fallback or speculative parallel run
  if (confidence < 0.45) {
    return {
      action: "speculativeRun",
      target: agent,
      reason: "low_confidence"
    };
  }

  // High latency → parallelize next stage
  if (latencyMs > 1200) {
    return {
      action: "parallelizeAgents",
      target: nextAgent(agent),
      reason: "high_latency"
    };
  }

  // High queue pressure → skip non-critical agent
  if (queueDepth > 20 && agent === "ENRICH") {
    return {
      action: "skipAgent",
      target: "ENRICH",
      reason: "queue_pressure"
    };
  }

  // Errors → fallback
  if (errors > 0) {
    return {
      action: "fallbackAgent",
      target: agent,
      reason: "errors_detected"
    };
  }

  // Default: no-op
  return {
    action: "none",
    target: agent,
    reason: "stable"
  };
}

function nextAgent(agent) {
  const idx = AGENTS.indexOf(agent);
  if (idx === -1 || idx === AGENTS.length - 1) return null;
  return AGENTS[idx + 1];
}

/**
 * Deterministic MAS Routing Decision
 * Accepts a telemetry packet, validates it, computes directive,
 * and returns a fully hashed, traceable decision object.
 */

export function analyzeSynergy(packet) {
  validatePacket(packet);
  const directive = computeDirective(packet);

  const hash = createHash("sha256")
    .update(JSON.stringify({ packet, directive }))
    .digest("hex");

  return {
    directive,
    correlationId: hash.slice(0, 16),
    timestamp: Date.now()
  };
}

/**
 * Structured JSON Logger
 * Operator-grade, deterministic, no side effects.
 */

export function logSynergyDecision(decision) {
  const entry = {
    ts: new Date().toISOString(),
    subsystem: "MAS",
    event: "synergy_decision",
    directive: decision.directive,
    correlationId: decision.correlationId
  };
  console.log(JSON.stringify(entry));
}
