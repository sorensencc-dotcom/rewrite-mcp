"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// File: projects/cic/tests/runtime/observability-v2.contract.test.ts | Date: 2026-05-30 | v1.3.3
const vitest_1 = require("vitest");
const metrics_collector_js_1 = require("../../src/reasoning/metrics-collector.js");
(0, vitest_1.describe)("Observability v2 — MetricsCollector Contract Tests", () => {
    (0, vitest_1.beforeEach)(() => {
        metrics_collector_js_1.metricsCollector.reset();
    });
    (0, vitest_1.it)("should initialize with clean aggregates on boot", () => {
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.ingestion.totalDocsIngested).toBe(0);
        (0, vitest_1.expect)(s.ingestion.totalErrors).toBe(0);
        (0, vitest_1.expect)(s.ingestion.docsPerMin).toBe(0);
        (0, vitest_1.expect)(s.ingestion.errorsPerMin).toBe(0);
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.semantic).toBe(0);
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.relationship).toBe(0);
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.topic).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.totalUpserts).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.totalQueries).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.latencyHistogram.p50).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.latencyHistogram.p95).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.latencyHistogram.p99).toBe(0);
        (0, vitest_1.expect)(s.persistentGraph.startupLoadTimeMs).toBe(0);
        (0, vitest_1.expect)(s.persistentGraph.snapshots.length).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.totalRequests).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.avgStagesPerQuery).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.avgEvidenceCountPerQuery).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.contradictionRate).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.totalContradictions).toBe(0);
        (0, vitest_1.expect)(s.rtkAutomation.mode).toBe("dry-run");
        (0, vitest_1.expect)(s.rtkAutomation.totalSafeguardTriggers).toBe(0);
    });
    (0, vitest_1.it)("should log document ingestion and compute sliding rate and extractor latencies", () => {
        // Record first ingestion
        metrics_collector_js_1.metricsCollector.recordIngestion(150, {
            semantic: 80,
            relationship: 50,
            topic: 20
        });
        // Record second ingestion
        metrics_collector_js_1.metricsCollector.recordIngestion(200, {
            semantic: 100,
            relationship: 60,
            topic: 40
        });
        // Record an error
        metrics_collector_js_1.metricsCollector.recordIngestionError();
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.ingestion.totalDocsIngested).toBe(2);
        (0, vitest_1.expect)(s.ingestion.totalErrors).toBe(1);
        (0, vitest_1.expect)(s.ingestion.docsPerMin).toBe(2);
        (0, vitest_1.expect)(s.ingestion.errorsPerMin).toBe(1);
        // Assert averages
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.semantic).toBe(90); // (80 + 100) / 2
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.relationship).toBe(55); // (50 + 60) / 2
        (0, vitest_1.expect)(s.ingestion.extractorLatencies.topic).toBe(30); // (20 + 40) / 2
    });
    (0, vitest_1.it)("should calculate Qdrant vector index percentiles correctly via circular buffers", () => {
        // Inject mock latencies
        const mockLatencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        mockLatencies.forEach(lat => {
            metrics_collector_js_1.metricsCollector.recordVectorQuery(lat);
            metrics_collector_js_1.metricsCollector.recordVectorUpsert(lat);
        });
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.vectorIndex.totalQueries).toBe(10);
        (0, vitest_1.expect)(s.vectorIndex.totalUpserts).toBe(10);
        const hist = s.vectorIndex.latencyHistogram;
        // Sorted array of 20 elements total in the buffer: [10,10,20,20,30,30,40,40,50,50,60,60,70,70,80,80,90,90,100,100]
        // p50 index = 20 * 0.5 = 10 -> 60 ms (approx)
        // p95 index = 20 * 0.95 = 19 -> 100 ms
        // p99 index = 20 * 0.99 = 19 -> 100 ms
        (0, vitest_1.expect)(hist.p50).toBeGreaterThanOrEqual(50);
        (0, vitest_1.expect)(hist.p50).toBeLessThanOrEqual(60);
        (0, vitest_1.expect)(hist.p95).toBe(100);
        (0, vitest_1.expect)(hist.p99).toBe(100);
    });
    (0, vitest_1.it)("should record persistent graph load timings and snapshots", () => {
        metrics_collector_js_1.metricsCollector.recordGraphLoad(350);
        metrics_collector_js_1.metricsCollector.recordGraphSnapshot("manual_sync", 4096, 45);
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.persistentGraph.startupLoadTimeMs).toBe(350);
        (0, vitest_1.expect)(s.persistentGraph.snapshots.length).toBe(1);
        (0, vitest_1.expect)(s.persistentGraph.snapshots[0].tag).toBe("manual_sync");
        (0, vitest_1.expect)(s.persistentGraph.snapshots[0].sizeBytes).toBe(4096);
        (0, vitest_1.expect)(s.persistentGraph.snapshots[0].durationMs).toBe(45);
    });
    (0, vitest_1.it)("should register multi-hop RAG metrics and contradictions", () => {
        // RAG query A: 3 stages, 4 evidence, 0 contradictions
        metrics_collector_js_1.metricsCollector.recordRAGQuery(3, 4, 0);
        // RAG query B: 3 stages, 6 evidence, 1 contradiction
        metrics_collector_js_1.metricsCollector.recordRAGQuery(3, 6, 1);
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.ragReasoning.totalRequests).toBe(2);
        (0, vitest_1.expect)(s.ragReasoning.avgStagesPerQuery).toBe(3.0);
        (0, vitest_1.expect)(s.ragReasoning.avgEvidenceCountPerQuery).toBe(5.0); // (4 + 6) / 2
        (0, vitest_1.expect)(s.ragReasoning.contradictionRate).toBe(0.5); // 1 out of 2 requests (50%)
        (0, vitest_1.expect)(s.ragReasoning.totalContradictions).toBe(1);
    });
    (0, vitest_1.it)("should record RTK safeguard triggers and interventions", () => {
        metrics_collector_js_1.metricsCollector.setRTKMode("active");
        metrics_collector_js_1.metricsCollector.recordSafeguardTrigger("RATE_LIMIT", "Ingest threshold exceeded: 100 docs/min", { limit: 100 });
        metrics_collector_js_1.metricsCollector.recordRTKIntervention("DECREASE_CONCURRENCY", "SUCCESS");
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.rtkAutomation.mode).toBe("active");
        (0, vitest_1.expect)(s.rtkAutomation.totalSafeguardTriggers).toBe(1);
        (0, vitest_1.expect)(s.rtkAutomation.safeguardTriggers[0].triggerType).toBe("RATE_LIMIT");
        (0, vitest_1.expect)(s.rtkAutomation.safeguardTriggers[0].reason).toContain("threshold exceeded");
        (0, vitest_1.expect)(s.rtkAutomation.recentInterventions.length).toBe(1);
        (0, vitest_1.expect)(s.rtkAutomation.recentInterventions[0].action).toBe("DECREASE_CONCURRENCY");
        (0, vitest_1.expect)(s.rtkAutomation.recentInterventions[0].outcome).toBe("SUCCESS");
    });
    (0, vitest_1.it)("should clear all active aggregates when reset is executed", () => {
        metrics_collector_js_1.metricsCollector.recordIngestion(120, { semantic: 50 });
        metrics_collector_js_1.metricsCollector.recordVectorQuery(15);
        metrics_collector_js_1.metricsCollector.recordGraphLoad(80);
        metrics_collector_js_1.metricsCollector.recordRAGQuery(3, 4, 1);
        metrics_collector_js_1.metricsCollector.reset();
        const s = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(s.ingestion.totalDocsIngested).toBe(0);
        (0, vitest_1.expect)(s.vectorIndex.totalQueries).toBe(0);
        (0, vitest_1.expect)(s.persistentGraph.startupLoadTimeMs).toBe(0);
        (0, vitest_1.expect)(s.ragReasoning.totalRequests).toBe(0);
    });
});
//# sourceMappingURL=observability-v2.contract.test.js.map