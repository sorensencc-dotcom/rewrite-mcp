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
export declare const SLO_TARGETS: {
    ingestion: {
        p95ExtractorLatencyMs: number;
        failureRatePct: number;
        backlogAgeSec: number;
    };
    vectorIndex: {
        p95HybridSearchLatencyMs: number;
        upsertThroughputPerSec: number;
    };
    persistentGraph: {
        startupLoadTimeMs: number;
        snapshotCreationTimeMs: number;
        lineageMergeMs: number;
    };
    ragReasoning: {
        p95ReasoningMs: number;
        contradictionRatePct: number;
        maxEvidenceBundleSize: number;
    };
    automation: {
        safeguardTriggers: number;
        dryRunDriftPct: number;
    };
};
export declare class MetricsCollector {
    private maxBufferSize;
    private window24h;
    private ingestionTimes;
    private ingestionErrorTimes;
    private totalDocsIngested;
    private totalErrors;
    private extSemanticSum;
    private extSemanticCount;
    private extRelationshipSum;
    private extRelationshipCount;
    private extTopicSum;
    private extTopicCount;
    private extReasoningSum;
    private extReasoningCount;
    private extractorLatencyBuffer;
    private backlogAgeBuffer;
    private upsertTimes;
    private queryTimes;
    private totalUpserts;
    private totalQueries;
    private vectorLatencyBuffer;
    private peakUpsertThroughput;
    private startupLoadTimeMs;
    private snapshotEvents;
    private lineageMergeBuffer;
    private ragTimes;
    private totalRagQueries;
    private totalStagesCount;
    private totalEvidenceCount;
    private totalContradictionCount;
    private ragLatencyBuffer;
    private rtkMode;
    private safeguardTriggers;
    private interventions;
    private dryRunDriftBuffer;
    private pruneTimestamps;
    private pruneBuffer;
    private getPercentile;
    recordIngestion(durationMs: number, latencies: Partial<ExtractorLatencies>): void;
    recordIngestionError(): void;
    recordBacklogAge(ageSec: number): void;
    recordVectorUpsert(durationMs: number): void;
    recordVectorQuery(durationMs: number): void;
    recordGraphLoad(durationMs: number): void;
    recordGraphSnapshot(tag: string, sizeBytes: number, durationMs: number): void;
    recordLineageMerge(durationMs: number): void;
    recordRAGQuery(durationOrStages: number, stagesOrEvidence: number, evidenceOrContradictions: number, contradictions?: number): void;
    setRTKMode(mode: "dry-run" | "active"): void;
    recordSafeguardTrigger(triggerType: string, reason: string, details?: any): void;
    recordRTKIntervention(action: string, outcome: string): void;
    recordDryRunDrift(driftPct: number): void;
    reset(): void;
    evaluateSLOs(): {
        status: "pass" | "fail";
        evaluations: SLOResult[];
    };
    getSnapshot(): {
        ingestion: {
            docsPerMin: number;
            errorsPerMin: number;
            totalDocsIngested: number;
            totalErrors: number;
            extractorLatencies: {
                semantic: number;
                relationship: number;
                topic: number;
                reasoning: number;
            };
        };
        vectorIndex: {
            upsertRatePerMin: number;
            queryRatePerMin: number;
            totalUpserts: number;
            totalQueries: number;
            latencyHistogram: {
                p50: number;
                p95: number;
                p99: number;
            };
        };
        persistentGraph: {
            startupLoadTimeMs: number;
            snapshots: SnapshotEvent[];
        };
        ragReasoning: {
            requestsPerMin: number;
            totalRequests: number;
            avgStagesPerQuery: number;
            avgEvidenceCountPerQuery: number;
            contradictionRate: number;
            totalContradictions: number;
        };
        rtkAutomation: {
            mode: "active" | "dry-run";
            totalSafeguardTriggers: number;
            safeguardTriggers: SafeguardTrigger[];
            recentInterventions: RTKIntervention[];
        };
        sloEvaluation: {
            status: "pass" | "fail";
            evaluations: SLOResult[];
        };
    };
}
export declare const metricsCollector: MetricsCollector;
