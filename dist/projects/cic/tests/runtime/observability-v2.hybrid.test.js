"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// File: projects/cic/tests/runtime/observability-v2.hybrid.test.ts | Date: 2026-05-30 | v1.3.3
const vitest_1 = require("vitest");
const harvester_js_1 = require("../../src/harvester/harvester.js");
const entity_resolver_js_1 = require("../../src/linking/entity-resolver.js");
const graph_builder_js_1 = require("../../src/linking/graph-builder.js");
const reasoning_orchestrator_js_1 = require("../../src/reasoning/reasoning-orchestrator.js");
const metrics_collector_js_1 = require("../../src/reasoning/metrics-collector.js");
(0, vitest_1.describe)("Observability v2 — Hybrid Integration Tests (Mode B)", () => {
    let harvester;
    (0, vitest_1.beforeEach)(() => {
        harvester = new harvester_js_1.Harvester();
        entity_resolver_js_1.entityResolver.clear();
        graph_builder_js_1.graphBuilder.clear();
        metrics_collector_js_1.metricsCollector.reset();
    });
    (0, vitest_1.it)("Scenario: ingest documents, run RAG queries, and assert telemetry metrics reflect reality", async () => {
        // 1. Assert telemetry is clean initially
        let snap = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(snap.ingestion.totalDocsIngested).toBe(0);
        (0, vitest_1.expect)(snap.ragReasoning.totalRequests).toBe(0);
        // 2. Perform a semantic ingestion
        await harvester.run({
            type: "semantic",
            payload: {
                docId: "doc-obs-hybrid-1",
                raw: "Chris Sorensen was born in Denmark. He worked at Ford Motor Company as a production expert."
            }
        });
        // 3. Assert telemetry reflects the ingestion count & rates
        snap = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(snap.ingestion.totalDocsIngested).toBe(1);
        (0, vitest_1.expect)(snap.ingestion.docsPerMin).toBe(1);
        (0, vitest_1.expect)(snap.ingestion.extractorLatencies.semantic).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(snap.ingestion.extractorLatencies.relationship).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(snap.ingestion.extractorLatencies.topic).toBeGreaterThanOrEqual(0);
        // Assert vector index upserts count matches
        (0, vitest_1.expect)(snap.vectorIndex.totalUpserts).toBeGreaterThanOrEqual(1);
        // 4. Run a multi-hop RAG reasoning query
        const trace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason("Identify the birthplace and career path of Chris Sorensen");
        // 5. Assert RAG query metrics are fully captured
        snap = metrics_collector_js_1.metricsCollector.getSnapshot();
        (0, vitest_1.expect)(snap.ragReasoning.totalRequests).toBe(1);
        (0, vitest_1.expect)(snap.ragReasoning.requestsPerMin).toBe(1);
        (0, vitest_1.expect)(snap.ragReasoning.avgStagesPerQuery).toBeGreaterThan(0);
        (0, vitest_1.expect)(snap.ragReasoning.avgEvidenceCountPerQuery).toBeGreaterThan(0);
        (0, vitest_1.expect)(snap.ragReasoning.contradictionRate).toBe(0); // No contradiction in this simple profile
        // Assert vector query count is recorded
        (0, vitest_1.expect)(snap.vectorIndex.totalQueries).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(snap.vectorIndex.latencyHistogram.p50).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=observability-v2.hybrid.test.js.map