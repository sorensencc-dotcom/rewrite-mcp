/**
 * Phase 23 Memory Layer Integration
 * Wires substrate, harvester, and synthesizer into a unified memory system
 */

import { MemorySubstrate } from "./memory-substrate";
import { MemoryHarvester } from "./memory-harvester";
import { MemorySynthesizer } from "./memory-synthesizer";
import { v4 as uuidv4 } from "uuid";

export class MemoryLayer {
  private substrate: MemorySubstrate;
  private harvester: MemoryHarvester;
  private synthesizer: MemorySynthesizer;

  constructor(storePath: string = "./memory_store.jsonl") {
    this.substrate = new MemorySubstrate({
      store_path: storePath,
      max_file_size_mb: 100,
      auto_archive: true,
      archive_destination: "./memory_archive",
    });

    const sessionId = `session_${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 8)}_${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

    this.harvester = new MemoryHarvester({
      substrate: this.substrate,
      session_id: sessionId,
    });

    this.synthesizer = new MemorySynthesizer(this.substrate);
  }

  /**
   * Get harvester for event recording
   */
  getHarvester(): MemoryHarvester {
    return this.harvester;
  }

  /**
   * Get synthesizer for trend analysis
   */
  getSynthesizer(): MemorySynthesizer {
    return this.synthesizer;
  }

  /**
   * Get substrate for direct queries
   */
  getSubstrate(): MemorySubstrate {
    return this.substrate;
  }

  /**
   * Run full memory health check
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "failed";
    stats: any;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const stats = this.substrate.getStats();

      if (stats.store_size_mb > 100) {
        issues.push(`Memory store exceeds 100MB (${stats.store_size_mb.toFixed(2)}MB). Archival should have run.`);
      }

      if (stats.total_events === 0) {
        issues.push("Memory store is empty. No events have been recorded.");
      }

      const status = issues.length === 0 ? "healthy" : issues.length > 2 ? "failed" : "degraded";

      return { status, stats, issues };
    } catch (err: any) {
      return {
        status: "failed",
        stats: null,
        issues: [err.message],
      };
    }
  }

  /**
   * Run scheduled weekly synthesis
   */
  async runWeeklySynthesis(): Promise<any> {
    try {
      const summary = await this.synthesizer.synthesizeWeekly();
      console.log(`[WEEKLY] Generated summary: ${summary.event_count} events in ${summary.week_start} to ${summary.week_end}`);
      return summary;
    } catch (err) {
      console.error(`[WEEKLY] Synthesis failed:`, err);
      throw err;
    }
  }

  /**
   * Run scheduled monthly synthesis
   */
  async runMonthlySynthesis(): Promise<any> {
    try {
      const summary = await this.synthesizer.synthesizeMonthly();
      console.log(`[MONTHLY] Generated summary: ${summary.aggregate_metrics.total_extractions} total extractions`);
      return summary;
    } catch (err) {
      console.error(`[MONTHLY] Synthesis failed:`, err);
      throw err;
    }
  }
}

/**
 * Singleton memory layer instance
 */
let globalMemoryLayer: MemoryLayer | null = null;

export function initializeMemoryLayer(storePath?: string): MemoryLayer {
  if (!globalMemoryLayer) {
    globalMemoryLayer = new MemoryLayer(storePath);
  }
  return globalMemoryLayer;
}

export function getMemoryLayer(): MemoryLayer {
  if (!globalMemoryLayer) {
    throw new Error("Memory layer not initialized. Call initializeMemoryLayer() first.");
  }
  return globalMemoryLayer;
}
