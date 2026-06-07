// File: projects/cic/src/reasoning/metrics-collector.ts | Date: 2026-05-30 | v1.3.4
/**
 * MetricsCollector provides thread-safe, in-memory telemetry aggregation.
 * Computes rates (docs/min, errors/min) using sliding time-windows.
 * Computes percentiles (p50, p95, p99) using circular buffers.
 * Includes production-grade SLO evaluation for Phase A.
 */

export interface ExtractorLatencies {
  semantic: number;
  relationship: number;
  topic: number;
  reasoning: number;
}

export interface SnapshotEvent {
  timestamp: string;
  tag: string;
  sizeBytes: number;
  durationMs: number;
}

export interface SafeguardTrigger {
  timestamp: string;
  triggerType: string;
  reason: string;
  details: any;
}

export interface RTKIntervention {
  timestamp: string;
  action: string;
  outcome: string;
}

export interface SLOResult {
  metric: string;
  target: string;
  actual: string;
  status: "pass" | "fail";
}

export const SLO_TARGETS = {
  ingestion: { p95ExtractorLatencyMs: 350, failureRatePct: 1.0, backlogAgeSec: 30 },
  vectorIndex: { p95HybridSearchLatencyMs: 120, upsertThroughputPerSec: 500 },
  persistentGraph: { startupLoadTimeMs: 500, snapshotCreationTimeMs: 200, lineageMergeMs: 5 },
  ragReasoning: { p95ReasoningMs: 1200, contradictionRatePct: 5.0, maxEvidenceBundleSize: 12 },
  automation: { safeguardTriggers: 0, dryRunDriftPct: 2.0 }
};

interface TimedValue {
  value: number;
  timestamp: number;
}

export class MetricsCollector {
  // Circular buffer limit (1000 items) to prevent memory leaks
  private maxBufferSize = 1000;
  // 24-hour window in milliseconds
  private window24h = 24 * 60 * 60 * 1000;

  // Ingestion metrics
  private ingestionTimes: number[] = [];
  private ingestionErrorTimes: number[] = [];
  private totalDocsIngested = 0;
  private totalErrors = 0;
  
  private extSemanticSum = 0;
  private extSemanticCount = 0;
  private extRelationshipSum = 0;
  private extRelationshipCount = 0;
  private extTopicSum = 0;
  private extTopicCount = 0;
  private extReasoningSum = 0;
  private extReasoningCount = 0;

  // Rolling Extractor latency buffer for p95 calculation
  private extractorLatencyBuffer: TimedValue[] = [];
  // Rolling Backlog Age buffer
  private backlogAgeBuffer: TimedValue[] = [];

  // Vector Index metrics
  private upsertTimes: number[] = [];
  private queryTimes: number[] = [];
  private totalUpserts = 0;
  private totalQueries = 0;
  private vectorLatencyBuffer: TimedValue[] = [];
  private peakUpsertThroughput = 0;

  // Persistent Graph metrics
  private startupLoadTimeMs = 0;
  private snapshotEvents: SnapshotEvent[] = [];
  private lineageMergeBuffer: TimedValue[] = [];

  // RAG Reasoning metrics
  private ragTimes: number[] = [];
  private totalRagQueries = 0;
  private totalStagesCount = 0;
  private totalEvidenceCount = 0;
  private totalContradictionCount = 0;
  private ragLatencyBuffer: TimedValue[] = [];

  // RTK Automation metrics
  private rtkMode: "dry-run" | "active" = "dry-run";
  private safeguardTriggers: SafeguardTrigger[] = [];
  private interventions: RTKIntervention[] = [];
  private dryRunDriftBuffer: TimedValue[] = [];

  // Helper: Prune timestamp arrays (60 seconds for rates)
  private pruneTimestamps(arr: number[]): number[] {
    const now = Date.now();
    return arr.filter(t => now - t < 60000);
  }

  // Helper: Prune and retrieve values inside 24-hour window
  private pruneBuffer(buffer: TimedValue[]): TimedValue[] {
    const now = Date.now();
    let updated = buffer.filter(item => now - item.timestamp < this.window24h);
    if (updated.length > this.maxBufferSize) {
      updated = updated.slice(-this.maxBufferSize);
    }
    return updated;
  }

  // Helper: Compute percentile on a buffer
  private getPercentile(buffer: TimedValue[], p: number): number {
    const active = this.pruneBuffer(buffer);
    if (active.length === 0) return 0;
    const sorted = active.map(item => item.value).sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * (p / 100));
    return sorted[Math.min(idx, sorted.length - 1)] || 0;
  }

  // Record an ingestion event
  recordIngestion(durationMs: number, latencies: Partial<ExtractorLatencies>) {
    const now = Date.now();
    this.ingestionTimes.push(now);
    this.totalDocsIngested++;

    this.extractorLatencyBuffer.push({ value: durationMs, timestamp: now });
    this.extractorLatencyBuffer = this.pruneBuffer(this.extractorLatencyBuffer);

    if (latencies.semantic !== undefined) {
      this.extSemanticSum += latencies.semantic;
      this.extSemanticCount++;
    }
    if (latencies.relationship !== undefined) {
      this.extRelationshipSum += latencies.relationship;
      this.extRelationshipCount++;
    }
    if (latencies.topic !== undefined) {
      this.extTopicSum += latencies.topic;
      this.extTopicCount++;
    }
    if (latencies.reasoning !== undefined) {
      this.extReasoningSum += latencies.reasoning;
      this.extReasoningCount++;
    }
  }

  // Record an ingestion processing error
  recordIngestionError() {
    const now = Date.now();
    this.ingestionErrorTimes.push(now);
    this.totalErrors++;
  }

  // Record backlog age
  recordBacklogAge(ageSec: number) {
    const now = Date.now();
    this.backlogAgeBuffer.push({ value: ageSec, timestamp: now });
    this.backlogAgeBuffer = this.pruneBuffer(this.backlogAgeBuffer);
  }

  // Record vector database upsert operation
  recordVectorUpsert(durationMs: number) {
    const now = Date.now();
    this.upsertTimes.push(now);
    this.totalUpserts++;
    
    // Calculate peak throughput in last 1 second
    const oneSecAgo = now - 1000;
    const upsertsLastSec = this.upsertTimes.filter(t => t >= oneSecAgo).length;
    if (upsertsLastSec > this.peakUpsertThroughput) {
      this.peakUpsertThroughput = upsertsLastSec;
    }
  }

  // Record vector database query operation
  recordVectorQuery(durationMs: number) {
    const now = Date.now();
    this.queryTimes.push(now);
    this.totalQueries++;
    
    this.vectorLatencyBuffer.push({ value: durationMs, timestamp: now });
    this.vectorLatencyBuffer = this.pruneBuffer(this.vectorLatencyBuffer);
  }

  // Record Persistent Graph Load Duration on startup
  recordGraphLoad(durationMs: number) {
    this.startupLoadTimeMs = durationMs;
  }

  // Record Persistent Graph Snapshot Trigger
  recordGraphSnapshot(tag: string, sizeBytes: number, durationMs: number) {
    this.snapshotEvents.push({
      timestamp: new Date().toISOString(),
      tag,
      sizeBytes,
      durationMs
    });
  }

  // Record Lineage Merge operation timing
  recordLineageMerge(durationMs: number) {
    const now = Date.now();
    this.lineageMergeBuffer.push({ value: durationMs, timestamp: now });
    this.lineageMergeBuffer = this.pruneBuffer(this.lineageMergeBuffer);
  }

  // Record a RAG Reasoning Query execution (overloaded to support legacy 3-argument calls)
  recordRAGQuery(
    durationOrStages: number,
    stagesOrEvidence: number,
    evidenceOrContradictions: number,
    contradictions?: number
  ) {
    const now = Date.now();
    this.ragTimes.push(now);
    this.totalRagQueries++;

    let durationMs = 0;
    let stagesCount = 0;
    let evidenceCount = 0;
    let contradictionsCount = 0;

    if (contradictions === undefined) {
      // Old 3-argument signature
      stagesCount = durationOrStages;
      evidenceCount = stagesOrEvidence;
      contradictionsCount = evidenceOrContradictions;
    } else {
      // New 4-argument signature
      durationMs = durationOrStages;
      stagesCount = stagesOrEvidence;
      evidenceCount = evidenceOrContradictions;
      contradictionsCount = contradictions;
    }

    this.totalStagesCount += stagesCount;
    this.totalEvidenceCount += evidenceCount;
    if (contradictionsCount > 0) {
      this.totalContradictionCount += contradictionsCount;
    }

    this.ragLatencyBuffer.push({ value: durationMs, timestamp: now });
    this.ragLatencyBuffer = this.pruneBuffer(this.ragLatencyBuffer);
  }

  // Set RTK automation mode
  setRTKMode(mode: "dry-run" | "active") {
    this.rtkMode = mode;
  }

  // Record an RTK safeguard violation trigger
  recordSafeguardTrigger(triggerType: string, reason: string, details?: any) {
    this.safeguardTriggers.push({
      timestamp: new Date().toISOString(),
      triggerType,
      reason,
      details: details || null
    });
  }

  // Record a physical RTK intervention action
  recordRTKIntervention(action: string, outcome: string) {
    this.interventions.push({
      timestamp: new Date().toISOString(),
      action,
      outcome
    });
  }

  // Record dry-run drift metrics
  recordDryRunDrift(driftPct: number) {
    const now = Date.now();
    this.dryRunDriftBuffer.push({ value: driftPct, timestamp: now });
    this.dryRunDriftBuffer = this.pruneBuffer(this.dryRunDriftBuffer);
  }

  // Clear metric state
  reset() {
    this.ingestionTimes = [];
    this.ingestionErrorTimes = [];
    this.totalDocsIngested = 0;
    this.totalErrors = 0;
    this.extSemanticSum = 0;
    this.extSemanticCount = 0;
    this.extRelationshipSum = 0;
    this.extRelationshipCount = 0;
    this.extTopicSum = 0;
    this.extTopicCount = 0;
    this.extReasoningSum = 0;
    this.extReasoningCount = 0;
    
    this.upsertTimes = [];
    this.queryTimes = [];
    this.totalUpserts = 0;
    this.totalQueries = 0;
    this.vectorLatencyBuffer = [];
    this.peakUpsertThroughput = 0;

    this.startupLoadTimeMs = 0;
    this.snapshotEvents = [];
    this.lineageMergeBuffer = [];

    this.ragTimes = [];
    this.totalRagQueries = 0;
    this.totalStagesCount = 0;
    this.totalEvidenceCount = 0;
    this.totalContradictionCount = 0;
    this.ragLatencyBuffer = [];

    this.safeguardTriggers = [];
    this.interventions = [];
    this.dryRunDriftBuffer = [];
  }

  // Evaluate SLO policies against baseline targets
  evaluateSLOs(): { status: "pass" | "fail"; evaluations: SLOResult[] } {
    const evals: SLOResult[] = [];
    let overallStatus: "pass" | "fail" = "pass";

    // 1. Ingestion Extractor Latency (p95 < 350ms)
    const p95Extractor = this.getPercentile(this.extractorLatencyBuffer, 95);
    const extStatus = p95Extractor <= SLO_TARGETS.ingestion.p95ExtractorLatencyMs ? "pass" : "fail";
    evals.push({
      metric: "Ingestion Extractor p95 Latency",
      target: `< ${SLO_TARGETS.ingestion.p95ExtractorLatencyMs}ms`,
      actual: `${Math.round(p95Extractor)}ms`,
      status: extStatus
    });

    // 2. Ingestion Failure Rate (< 1%)
    const totalOps = this.totalDocsIngested + this.totalErrors;
    const failPct = totalOps > 0 ? (this.totalErrors / totalOps) * 100 : 0;
    const failStatus = failPct <= SLO_TARGETS.ingestion.failureRatePct ? "pass" : "fail";
    evals.push({
      metric: "Ingestion Failure Rate",
      target: `< ${SLO_TARGETS.ingestion.failureRatePct}%`,
      actual: `${failPct.toFixed(2)}%`,
      status: failStatus
    });

    // 3. Ingestion Backlog Age (< 30s)
    const activeAges = this.pruneBuffer(this.backlogAgeBuffer);
    const maxBacklog = activeAges.length > 0 ? Math.max(...activeAges.map(i => i.value)) : 0;
    const backlogStatus = maxBacklog <= SLO_TARGETS.ingestion.backlogAgeSec ? "pass" : "fail";
    evals.push({
      metric: "Ingestion Backlog Age",
      target: `< ${SLO_TARGETS.ingestion.backlogAgeSec}s`,
      actual: `${maxBacklog}s`,
      status: backlogStatus
    });

    // 4. Vector p95 Hybrid Search Latency (< 120ms)
    const p95Vector = this.getPercentile(this.vectorLatencyBuffer, 95);
    const vecStatus = p95Vector <= SLO_TARGETS.vectorIndex.p95HybridSearchLatencyMs ? "pass" : "fail";
    evals.push({
      metric: "Vector Hybrid Search p95 Latency",
      target: `< ${SLO_TARGETS.vectorIndex.p95HybridSearchLatencyMs}ms`,
      actual: `${Math.round(p95Vector)}ms`,
      status: vecStatus
    });

    // 5. Vector Upsert Throughput (> 500/sec in test mode)
    // Note: If peakThroughput is 0 and we haven't ingested, default to pass if no work was done
    const througputStatus = (this.peakUpsertThroughput >= SLO_TARGETS.vectorIndex.upsertThroughputPerSec || this.totalUpserts === 0) ? "pass" : "fail";
    evals.push({
      metric: "Vector Peak Upsert Throughput",
      target: `> ${SLO_TARGETS.vectorIndex.upsertThroughputPerSec}/sec`,
      actual: `${this.peakUpsertThroughput}/sec`,
      status: througputStatus
    });

    // 6. Persistent Graph Startup Load (< 500ms)
    const loadStatus = this.startupLoadTimeMs <= SLO_TARGETS.persistentGraph.startupLoadTimeMs ? "pass" : "fail";
    evals.push({
      metric: "Graph Startup Load Duration",
      target: `< ${SLO_TARGETS.persistentGraph.startupLoadTimeMs}ms`,
      actual: `${this.startupLoadTimeMs}ms`,
      status: loadStatus
    });

    // 7. Persistent Graph Snapshot Creation (< 200ms)
    const lastSnapshot = this.snapshotEvents.slice(-1)[0];
    const snapDuration = lastSnapshot ? lastSnapshot.durationMs : 0;
    const snapStatus = snapDuration <= SLO_TARGETS.persistentGraph.snapshotCreationTimeMs ? "pass" : "fail";
    evals.push({
      metric: "Graph Snapshot Creation Latency",
      target: `< ${SLO_TARGETS.persistentGraph.snapshotCreationTimeMs}ms`,
      actual: `${snapDuration}ms`,
      status: snapStatus
    });

    // 8. Persistent Graph Lineage Merge (< 5ms)
    const activeMerges = this.pruneBuffer(this.lineageMergeBuffer);
    const avgMerge = activeMerges.length > 0 ? (activeMerges.reduce((sum, item) => sum + item.value, 0) / activeMerges.length) : 0;
    const mergeStatus = avgMerge <= SLO_TARGETS.persistentGraph.lineageMergeMs ? "pass" : "fail";
    evals.push({
      metric: "Graph Avg Lineage Merge Duration",
      target: `< ${SLO_TARGETS.persistentGraph.lineageMergeMs}ms`,
      actual: `${avgMerge.toFixed(2)}ms`,
      status: mergeStatus
    });

    // 9. RAG Reasoning p95 Cycle (< 1.2s)
    const p95Reasoning = this.getPercentile(this.ragLatencyBuffer, 95);
    const reasoningStatus = p95Reasoning <= SLO_TARGETS.ragReasoning.p95ReasoningMs ? "pass" : "fail";
    evals.push({
      metric: "RAG Reasoning p95 Cycle",
      target: `< ${SLO_TARGETS.ragReasoning.p95ReasoningMs}ms`,
      actual: `${Math.round(p95Reasoning)}ms`,
      status: reasoningStatus
    });

    // 10. RAG Reasoning Contradiction Rate (< 5%)
    const contrRate = this.totalRagQueries > 0 ? (this.totalContradictionCount / this.totalRagQueries) * 100 : 0;
    const contrStatus = contrRate <= SLO_TARGETS.ragReasoning.contradictionRatePct ? "pass" : "fail";
    evals.push({
      metric: "RAG Contradiction Rate",
      target: `< ${SLO_TARGETS.ragReasoning.contradictionRatePct}%`,
      actual: `${contrRate.toFixed(2)}%`,
      status: contrStatus
    });

    // 11. RAG Reasoning Evidence Bundle Size (< 12 items)
    const avgEvidence = this.totalRagQueries > 0 ? (this.totalEvidenceCount / this.totalRagQueries) : 0;
    const evidenceStatus = avgEvidence <= SLO_TARGETS.ragReasoning.maxEvidenceBundleSize ? "pass" : "fail";
    evals.push({
      metric: "RAG Evidence Bundle Avg Size",
      target: `< ${SLO_TARGETS.ragReasoning.maxEvidenceBundleSize} items`,
      actual: `${avgEvidence.toFixed(1)} items`,
      status: evidenceStatus
    });

    // 12. Automation Safeguard Triggers (= 0)
    const triggersCount = this.safeguardTriggers.length;
    const triggersStatus = triggersCount === SLO_TARGETS.automation.safeguardTriggers ? "pass" : "fail";
    evals.push({
      metric: "RTK Active Safeguard Triggers",
      target: `== ${SLO_TARGETS.automation.safeguardTriggers}`,
      actual: `${triggersCount}`,
      status: triggersStatus
    });

    // 13. Automation Dry-Run Drift (< 2%)
    const activeDrifts = this.pruneBuffer(this.dryRunDriftBuffer);
    const avgDrift = activeDrifts.length > 0 ? (activeDrifts.reduce((sum, item) => sum + item.value, 0) / activeDrifts.length) : 0;
    const driftStatus = avgDrift <= SLO_TARGETS.automation.dryRunDriftPct ? "pass" : "fail";
    evals.push({
      metric: "RTK Dry-Run Avg Memory/State Drift",
      target: `< ${SLO_TARGETS.automation.dryRunDriftPct}%`,
      actual: `${avgDrift.toFixed(2)}%`,
      status: driftStatus
    });

    // Determine overall compliance status
    if (evals.some(e => e.status === "fail")) {
      overallStatus = "fail";
    }

    return { status: overallStatus, evaluations: evals };
  }

  // Compile active system metrics snapshot
  getSnapshot() {
    // Refresh rolling windows
    this.ingestionTimes = this.pruneTimestamps(this.ingestionTimes);
    this.ingestionErrorTimes = this.pruneTimestamps(this.ingestionErrorTimes);
    this.upsertTimes = this.pruneTimestamps(this.upsertTimes);
    this.queryTimes = this.pruneTimestamps(this.queryTimes);
    this.ragTimes = this.pruneTimestamps(this.ragTimes);

    const vectorLatency = {
      p50: Math.round(this.getPercentile(this.vectorLatencyBuffer, 50)),
      p95: Math.round(this.getPercentile(this.vectorLatencyBuffer, 95)),
      p99: Math.round(this.getPercentile(this.vectorLatencyBuffer, 99))
    };

    const sloEval = this.evaluateSLOs();

    return {
      ingestion: {
        docsPerMin: this.ingestionTimes.length,
        errorsPerMin: this.ingestionErrorTimes.length,
        totalDocsIngested: this.totalDocsIngested,
        totalErrors: this.totalErrors,
        extractorLatencies: {
          semantic: this.extSemanticCount > 0 ? Math.round(this.extSemanticSum / this.extSemanticCount) : 0,
          relationship: this.extRelationshipCount > 0 ? Math.round(this.extRelationshipSum / this.extRelationshipCount) : 0,
          topic: this.extTopicCount > 0 ? Math.round(this.extTopicSum / this.extTopicCount) : 0,
          reasoning: this.extReasoningCount > 0 ? Math.round(this.extReasoningSum / this.extReasoningCount) : 0
        }
      },
      vectorIndex: {
        upsertRatePerMin: this.upsertTimes.length,
        queryRatePerMin: this.queryTimes.length,
        totalUpserts: this.totalUpserts,
        totalQueries: this.totalQueries,
        latencyHistogram: vectorLatency
      },
      persistentGraph: {
        startupLoadTimeMs: this.startupLoadTimeMs,
        snapshots: this.snapshotEvents
      },
      ragReasoning: {
        requestsPerMin: this.ragTimes.length,
        totalRequests: this.totalRagQueries,
        avgStagesPerQuery: this.totalRagQueries > 0 ? Math.round((this.totalStagesCount / this.totalRagQueries) * 10) / 10 : 0,
        avgEvidenceCountPerQuery: this.totalRagQueries > 0 ? Math.round((this.totalEvidenceCount / this.totalRagQueries) * 10) / 10 : 0,
        contradictionRate: this.totalRagQueries > 0 ? Math.round((this.totalContradictionCount / this.totalRagQueries) * 100) / 100 : 0,
        totalContradictions: this.totalContradictionCount
      },
      rtkAutomation: {
        mode: this.rtkMode,
        totalSafeguardTriggers: this.safeguardTriggers.length,
        safeguardTriggers: this.safeguardTriggers.slice(-50), // keep last 50
        recentInterventions: this.interventions.slice(-50)
      },
      sloEvaluation: sloEval
    };
  }
}

export const metricsCollector = new MetricsCollector();
