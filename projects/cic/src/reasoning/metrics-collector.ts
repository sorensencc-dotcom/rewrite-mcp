// File: projects/cic/src/reasoning/metrics-collector.ts | Date: 2026-05-30 | v1.3.3
/**
 * MetricsCollector provides thread-safe, in-memory telemetry aggregation.
 * Computes rates (docs/min, errors/min) using sliding time-windows.
 * Computes percentiles (p50, p95, p99) using circular buffers.
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

export class MetricsCollector {
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

  // Vector Index metrics
  private upsertTimes: number[] = [];
  private queryTimes: number[] = [];
  private totalUpserts = 0;
  private totalQueries = 0;
  private vectorLatencyBuffer: number[] = [];
  private maxBufferSize = 1000;

  // Persistent Graph metrics
  private startupLoadTimeMs = 0;
  private snapshotEvents: SnapshotEvent[] = [];

  // RAG Reasoning metrics
  private ragTimes: number[] = [];
  private totalRagQueries = 0;
  private totalStagesCount = 0;
  private totalEvidenceCount = 0;
  private totalContradictionCount = 0;

  // RTK Automation metrics
  private rtkMode: "dry-run" | "active" = "dry-run";
  private safeguardTriggers: SafeguardTrigger[] = [];
  private interventions: RTKIntervention[] = [];

  // Cleanup old timestamps from rolling window (60 seconds)
  private pruneTimestamps(arr: number[]): number[] {
    const now = Date.now();
    return arr.filter(t => now - t < 60000);
  }

  // Calculate sliding rate count
  private getRate(arr: number[]): number {
    return this.pruneTimestamps(arr).length;
  }

  // Record an ingestion event
  recordIngestion(durationMs: number, latencies: Partial<ExtractorLatencies>) {
    const now = Date.now();
    this.ingestionTimes.push(now);
    this.totalDocsIngested++;

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

  // Record vector database upsert operation
  recordVectorUpsert(durationMs: number) {
    const now = Date.now();
    this.upsertTimes.push(now);
    this.totalUpserts++;
    this.pushLatency(durationMs);
  }

  // Record vector database query operation
  recordVectorQuery(durationMs: number) {
    const now = Date.now();
    this.queryTimes.push(now);
    this.totalQueries++;
    this.pushLatency(durationMs);
  }

  private pushLatency(lat: number) {
    this.vectorLatencyBuffer.push(lat);
    if (this.vectorLatencyBuffer.length > this.maxBufferSize) {
      this.vectorLatencyBuffer.shift();
    }
  }

  // Compute Vector Index Latency Percentiles
  private getVectorPercentiles() {
    if (this.vectorLatencyBuffer.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }
    const sorted = [...this.vectorLatencyBuffer].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.50)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0
    };
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

  // Record a RAG Reasoning Query execution
  recordRAGQuery(stagesCount: number, evidenceCount: number, contradictionsCount: number) {
    const now = Date.now();
    this.ragTimes.push(now);
    this.totalRagQueries++;
    this.totalStagesCount += stagesCount;
    this.totalEvidenceCount += evidenceCount;
    if (contradictionsCount > 0) {
      this.totalContradictionCount += contradictionsCount;
    }
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

    this.startupLoadTimeMs = 0;
    this.snapshotEvents = [];

    this.ragTimes = [];
    this.totalRagQueries = 0;
    this.totalStagesCount = 0;
    this.totalEvidenceCount = 0;
    this.totalContradictionCount = 0;

    this.safeguardTriggers = [];
    this.interventions = [];
  }

  // Compile active system metrics snapshot
  getSnapshot() {
    // Refresh rolling windows
    this.ingestionTimes = this.pruneTimestamps(this.ingestionTimes);
    this.ingestionErrorTimes = this.pruneTimestamps(this.ingestionErrorTimes);
    this.upsertTimes = this.pruneTimestamps(this.upsertTimes);
    this.queryTimes = this.pruneTimestamps(this.queryTimes);
    this.ragTimes = this.pruneTimestamps(this.ragTimes);

    const vectorLatency = this.getVectorPercentiles();

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
      }
    };
  }
}

export const metricsCollector = new MetricsCollector();
