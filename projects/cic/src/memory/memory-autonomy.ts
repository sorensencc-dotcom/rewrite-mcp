// File: projects/cic/src/memory/memory-autonomy.ts | Date: 2026-06-03 | v1.0.0

/**
 * memory-autonomy.ts
 * Phase 23.7 — Memory-Driven Autonomy
 */

import { MemorySubstrate } from "./memory-substrate.js";

export interface AutonomyProposal {
  id: string;
  reason: string;
  recommendation: string;
  timestamp: string;
}

export class MemoryAutonomyEngine {
  constructor(private substrate: MemorySubstrate) {}

  detectStalePhases(): AutonomyProposal[] {
    const events = this.substrate.query({});
    const laneProgressEvents = events.filter(e => e.type === "lane.progress");

    // If no progress events exist or the last one is older than 45 days
    if (laneProgressEvents.length === 0) {
      return [{
        id: `prop_stale_${Math.random().toString(36).substring(2, 11)}`,
        reason: "No active lane progress logged in the memory substrate.",
        recommendation: "Initialize lane-level tracking to establish development velocity baselines.",
        timestamp: new Date().toISOString()
      }];
    }

    const lastEvent = laneProgressEvents[laneProgressEvents.length - 1];
    const daysSinceLastProgress = (Date.now() - Date.parse(lastEvent.timestamp)) / (1000 * 60 * 60 * 24);

    if (daysSinceLastProgress >= 45) {
      return [{
        id: `prop_stale_${Math.random().toString(36).substring(2, 11)}`,
        reason: `Lane progress has stalled. Last event occurred ${Math.floor(daysSinceLastProgress)} days ago.`,
        recommendation: "Trigger a retroactive audit of delayed milestones and escalate bottleneck items.",
        timestamp: new Date().toISOString()
      }];
    }

    return [];
  }

  detectRepeatedFailures(): AutonomyProposal[] {
    const events = this.substrate.query({});
    const failures = events.filter(e => e.payload && e.payload.status === "failed");

    if (failures.length >= 3) {
      return [{
        id: `prop_fail_${Math.random().toString(36).substring(2, 11)}`,
        reason: `Detected ${failures.length} system task failures in historical records.`,
        recommendation: "Deploy automated retry safeguards and scale down parallel workers to lower concurrency load.",
        timestamp: new Date().toISOString()
      }];
    }

    return [];
  }

  detectPromptDrift(): AutonomyProposal[] {
    const events = this.substrate.query({});
    const sandboxDecisions = events.filter(e => e.type === "sandbox.decision");
    const lowSimilarityDecisions = sandboxDecisions.filter(e => e.payload?.similarity < 0.85);

    if (lowSimilarityDecisions.length > 0) {
      return [{
        id: `prop_drift_${Math.random().toString(36).substring(2, 11)}`,
        reason: `Detected prompt similarity values falling below the 0.85 similarity gate floor.`,
        recommendation: "Recalibrate PMS prompt templates and trigger Jaccard fallback similarity checks.",
        timestamp: new Date().toISOString()
      }];
    }

    return [];
  }

  detectLaneStagnation(): AutonomyProposal[] {
    const events = this.substrate.query({});
    const laneProgress = events.filter(e => e.type === "lane.progress");
    const stagnantEvents = laneProgress.filter(e => e.payload?.stagnant === true);

    if (stagnantEvents.length > 0) {
      return [{
        id: `prop_stag_${Math.random().toString(36).substring(2, 11)}`,
        reason: "Lanes are marked stagnant due to lack of incremental milestone commits.",
        recommendation: "Re-stage current branch commits and verify git tracking status.",
        timestamp: new Date().toISOString()
      }];
    }

    return [];
  }

  run(): AutonomyProposal[] {
    const proposals = [
      ...this.detectStalePhases(),
      ...this.detectRepeatedFailures(),
      ...this.detectPromptDrift(),
      ...this.detectLaneStagnation()
    ];

    // Fallback if no specific issues are flagged
    if (proposals.length === 0) {
      proposals.push({
        id: `prop_nominal_${Math.random().toString(36).substring(2, 11)}`,
        reason: "All tracked subsystem metrics are operating within normal nominal margins.",
        recommendation: "Maintain current development ascent speed.",
        timestamp: new Date().toISOString()
      });
    }

    return proposals;
  }
}
