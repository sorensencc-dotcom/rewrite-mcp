// File: projects/cic/evolution/src/amb/ambMemoryStore.ts | Date: 2026-06-05 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  AmbMemorySnapshot,
  AmbMemoryIntentRecord,
  AmbMemoryProposalRecord,
  AmbMemoryMasRecord,
  AmbMemoryDriftRecord,
  AmbMemoryRlRecord
} from "../types/ambStrategic.js";
import { AmbIntentArtifact } from "../types/ambIntent.js";
import { MasHealthSnapshot } from "./ambMasHealthConfig.js";

export class AmbMemoryStore {
  private memoryDir: string;

  constructor(baseDir?: string) {
    this.memoryDir = baseDir || path.resolve(process.cwd(), "projects/cic/evolution/data/amb/memory");
    fs.mkdirSync(this.memoryDir, { recursive: true });
  }

  /**
   * Load the most recent memory snapshot, or null if none exists.
   */
  public loadLatestSnapshot(): AmbMemorySnapshot | null {
    const files = this.listSnapshotFiles();
    if (files.length === 0) return null;

    // Sort by filename (timestamp-based) descending
    files.sort((a, b) => b.localeCompare(a));
    const latestPath = path.join(this.memoryDir, files[0]);

    try {
      const raw = fs.readFileSync(latestPath, "utf8");
      return JSON.parse(raw) as AmbMemorySnapshot;
    } catch {
      return null;
    }
  }

  /**
   * Record a completed AMB + Evolution run into the memory snapshot.
   * Merges new data with the latest snapshot (or creates a fresh one).
   */
  public recordRun(params: {
    runId: string;
    intents: AmbIntentArtifact[];
    proposals: { proposalId: string; sourceIntentId?: string; applied: boolean; failed: boolean; impactMetrics?: Record<string, number> }[];
    masSnapshot: MasHealthSnapshot;
    driftMetrics: { tenant_drift_index?: number; graph_entropy?: number };
    rlMetrics?: { tenant_id: string; site_id: string; metrics: Record<string, number> };
  }): AmbMemorySnapshot {
    const existing = this.loadLatestSnapshot();
    const now = new Date().toISOString();

    const intentRecords: AmbMemoryIntentRecord[] = params.intents.map(i => ({
      intent_id: i.intent_id,
      run_id: params.runId,
      intent_type: i.intent_type,
      risk_class: i.risk_class,
      status: i.status || "approved",
      strategic_score: (i as any).strategic_score,
      timestamp: now
    }));

    const proposalRecords: AmbMemoryProposalRecord[] = params.proposals.map(p => ({
      proposal_id: p.proposalId,
      run_id: params.runId,
      source_intent_id: p.sourceIntentId,
      applied: p.applied,
      failed: p.failed,
      impact_metrics: p.impactMetrics
    }));

    const masRecord: AmbMemoryMasRecord = {
      run_id: params.runId,
      timestamp: now,
      globalErrorRate: params.masSnapshot.globalErrorRate,
      globalTimeoutRate: params.masSnapshot.globalTimeoutRate,
      queueBacklogDepth: params.masSnapshot.queueBacklogDepth,
      criticalAgentsHealth: params.masSnapshot.criticalAgentsHealth
    };

    const driftRecord: AmbMemoryDriftRecord = {
      run_id: params.runId,
      timestamp: now,
      tenant_drift_index: params.driftMetrics.tenant_drift_index,
      graph_entropy: params.driftMetrics.graph_entropy
    };

    const snapshot: AmbMemorySnapshot = {
      snapshot_id: `mem-${crypto.randomUUID().substring(0, 8)}`,
      timestamp: now,
      intents: [...(existing?.intents || []), ...intentRecords],
      proposals: [...(existing?.proposals || []), ...proposalRecords],
      mas_health_history: [...(existing?.mas_health_history || []), masRecord],
      drift_history: [...(existing?.drift_history || []), driftRecord],
      rl_impact_history: [
        ...(existing?.rl_impact_history || []),
        ...(params.rlMetrics
          ? [{
              run_id: params.runId,
              timestamp: now,
              tenant_id: params.rlMetrics.tenant_id,
              site_id: params.rlMetrics.site_id,
              metrics: params.rlMetrics.metrics
            }]
          : [])
      ]
    };

    this.saveSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Write a memory snapshot to disk.
   */
  public saveSnapshot(snapshot: AmbMemorySnapshot): void {
    const filename = `memory_${Date.now()}.json`;
    const filePath = path.join(this.memoryDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  /**
   * Get intent history, optionally limited to the last N entries.
   */
  public getIntentHistory(lookback?: number): AmbMemoryIntentRecord[] {
    const snapshot = this.loadLatestSnapshot();
    if (!snapshot) return [];
    const intents = snapshot.intents;
    if (lookback && lookback < intents.length) {
      return intents.slice(intents.length - lookback);
    }
    return intents;
  }

  /**
   * Compute the ratio of successfully applied proposals to total proposals.
   */
  public getProposalSuccessRate(): number {
    const snapshot = this.loadLatestSnapshot();
    if (!snapshot || snapshot.proposals.length === 0) return 0;
    const applied = snapshot.proposals.filter(p => p.applied && !p.failed).length;
    return parseFloat((applied / snapshot.proposals.length).toFixed(3));
  }

  /**
   * Get drift index values over the last N runs.
   */
  public getDriftTrend(lookback?: number): number[] {
    const snapshot = this.loadLatestSnapshot();
    if (!snapshot) return [];
    let history = snapshot.drift_history;
    if (lookback && lookback < history.length) {
      history = history.slice(history.length - lookback);
    }
    return history.map(d => d.tenant_drift_index ?? 0);
  }

  /**
   * Get MAS global error rate over the last N runs.
   */
  public getMasStabilityTrend(lookback?: number): number[] {
    const snapshot = this.loadLatestSnapshot();
    if (!snapshot) return [];
    let history = snapshot.mas_health_history;
    if (lookback && lookback < history.length) {
      history = history.slice(history.length - lookback);
    }
    return history.map(m => m.globalErrorRate);
  }

  /**
   * List all snapshot files in the memory directory.
   */
  private listSnapshotFiles(): string[] {
    try {
      return fs.readdirSync(this.memoryDir).filter(f => f.startsWith("memory_") && f.endsWith(".json"));
    } catch {
      return [];
    }
  }
}
