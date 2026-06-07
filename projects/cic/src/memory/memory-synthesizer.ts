// File: projects/cic/src/memory/memory-synthesizer.ts | Date: 2026-06-03 | v1.0.0

import { MemorySubstrate } from "./memory-substrate.js";

export class MemorySynthesizer {
  constructor(private substrate: MemorySubstrate) {}

  weeklySummary(): any {
    const events = this.substrate.query({});
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyEvents = events.filter(e => new Date(e.timestamp) >= sevenDaysAgo);

    return {
      period: "weekly",
      eventsCount: weeklyEvents.length,
      timestamp: new Date().toISOString(),
      summary: `Weekly run generated with ${weeklyEvents.length} events.`
    };
  }

  monthlyReport(): any {
    const events = this.substrate.query({});
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyEvents = events.filter(e => new Date(e.timestamp) >= thirtyDaysAgo);

    return {
      period: "monthly",
      eventsCount: monthlyEvents.length,
      timestamp: new Date().toISOString(),
      report: `Monthly evolution report generated with ${monthlyEvents.length} events.`
    };
  }

  detectTrends(): any {
    const events = this.substrate.query({});
    const failures = events.filter(e => e.payload && e.payload.status === "failed");

    return {
      trendDetected: failures.length > 5 ? "high_failure_rate" : "stable",
      failureCount: failures.length,
      timestamp: new Date().toISOString()
    };
  }

  async run(): Promise<void> {
    const summary = this.weeklySummary();
    const trend = this.detectTrends();

    this.substrate.append({
      id: `evt_synth_${Math.random().toString(36).substring(2, 11)}`,
      type: "agent.output",
      timestamp: new Date().toISOString(),
      payload: {
        summary,
        trend
      }
    });
  }
}
