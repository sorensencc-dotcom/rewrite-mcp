// File: projects/cic/src/agents/roadmapping/arps-memory-integration.ts | Date: 2026-06-03 | v1.0.0

/**
 * arps-memory-integration.ts
 * Phase 23 — ARPS ↔ Memory Layer Integration Rules
 */

import { MemorySubstrate } from "../../memory/memory-substrate.js";

export class ArpsMemoryIntegration {
  constructor(private substrate: MemorySubstrate) {}

  getRepeatedFailures() {
    const events = this.substrate.query({ type: "docs.build" });
    return events.filter(e => e.payload && e.payload.ok === false);
  }

  getPromptDriftTrend() {
    const events = this.substrate.query({ type: "sandbox.decision" });
    return events.map(e => e.payload?.similarity).filter(s => typeof s === "number") as number[];
  }

  getStalePhases() {
    const deltas = this.substrate.query({ type: "roadmap.delta" });
    const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
    return deltas.filter(e => new Date(e.timestamp).getTime() < cutoff);
  }

  buildArpsHints() {
    return {
      repeatedFailures: this.getRepeatedFailures().length,
      driftTrend: this.getPromptDriftTrend(),
      stalePhases: this.getStalePhases().length
    };
  }
}
