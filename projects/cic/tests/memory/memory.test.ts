// File: projects/cic/tests/memory/memory.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MemorySubstrate, MemoryEvent } from "../../src/memory/memory-substrate.js";
import { MemoryHarvester } from "../../src/memory/memory-harvester.js";
import { MemorySynthesizer } from "../../src/memory/memory-synthesizer.js";
import { MemoryAutonomyEngine } from "../../src/memory/memory-autonomy.js";
import { ArpsMemoryIntegration } from "../../src/agents/roadmapping/arps-memory-integration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 23 — Memory Layer", () => {
  const tempLedgerPath = path.resolve(__dirname, "../../data/temp-test-ledger-23.jsonl");

  beforeEach(() => {
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
  });

  it("appends and queries events", () => {
    const substrate = new MemorySubstrate(tempLedgerPath);
    substrate.append({
      id: "evt-1",
      type: "pipeline.run",
      timestamp: new Date().toISOString(),
      payload: { status: "success" }
    });

    const events = substrate.query({ type: "pipeline.run" });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe("evt-1");
  });

  it("harvester produces structured events", async () => {
    const substrate = new MemorySubstrate(tempLedgerPath);
    const harvester = new MemoryHarvester(substrate);

    const events = await harvester.collect();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("synthesizer generates summaries", () => {
    const substrate = new MemorySubstrate(tempLedgerPath);
    const synth = new MemorySynthesizer(substrate);

    substrate.append({
      id: "evt-1",
      type: "pipeline.run",
      timestamp: new Date().toISOString(),
      payload: { status: "success" }
    });

    const weekly = synth.weeklySummary();
    expect(weekly).toBeDefined();
    expect(weekly.eventsCount).toBe(1);
  });

  it("autonomy engine detects stales, failures, and drift", () => {
    const substrate = new MemorySubstrate(tempLedgerPath);
    const autonomy = new MemoryAutonomyEngine(substrate);

    // 1. Nominal check
    // Since there are no events, detectStalePhases should recommend initializing.
    let proposals = autonomy.run();
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.some(p => p.recommendation.includes("Initialize"))).toBe(true);

    // 2. Failure check
    for (let i = 0; i < 4; i++) {
      substrate.append({
        id: `evt-fail-${i}`,
        type: "pipeline.run",
        timestamp: new Date().toISOString(),
        payload: { status: "failed" }
      });
    }
    
    // Append a lane progress event within 45 days so we don't trigger stale phase recommendation
    substrate.append({
      id: "evt-lane-ok",
      type: "lane.progress",
      timestamp: new Date().toISOString(),
      payload: { status: "active" }
    });

    proposals = autonomy.run();
    expect(proposals.some(p => p.reason.includes("failures"))).toBe(true);

    // 3. Drift check
    substrate.append({
      id: "evt-drift",
      type: "sandbox.decision",
      timestamp: new Date().toISOString(),
      payload: { similarity: 0.81 } // under 0.85
    });

    proposals = autonomy.run();
    expect(proposals.some(p => p.reason.includes("similarity"))).toBe(true);
  });

  it("ARPS Memory Integration collects failures, drift, and stale phases", () => {
    const substrate = new MemorySubstrate(tempLedgerPath);
    const integration = new ArpsMemoryIntegration(substrate);

    substrate.append({
      id: "evt-fail",
      type: "docs.build",
      timestamp: new Date().toISOString(),
      payload: { ok: false }
    });

    substrate.append({
      id: "evt-drift",
      type: "sandbox.decision",
      timestamp: new Date().toISOString(),
      payload: { similarity: 0.88 }
    });

    substrate.append({
      id: "evt-delta",
      type: "roadmap.delta",
      timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
      payload: {}
    });

    const hints = integration.buildArpsHints();
    expect(hints.repeatedFailures).toBe(1);
    expect(hints.driftTrend).toEqual([0.88]);
    expect(hints.stalePhases).toBe(1);
  });
});
