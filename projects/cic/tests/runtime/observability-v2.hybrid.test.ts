// File: projects/cic/tests/runtime/observability-v2.hybrid.test.ts | Date: 2026-05-30 | v1.3.3
import { describe, it, expect, beforeEach } from "vitest";
import { Harvester } from "../../src/harvester/harvester.js";
import { entityResolver } from "../../src/linking/entity-resolver.js";
import { graphBuilder } from "../../src/linking/graph-builder.js";
import { reasoningOrchestrator } from "../../src/reasoning/reasoning-orchestrator.js";
import { metricsCollector } from "../../src/reasoning/metrics-collector.js";

describe("Observability v2 — Hybrid Integration Tests (Mode B)", () => {
  let harvester: Harvester;

  beforeEach(() => {
    harvester = new Harvester();
    entityResolver.clear();
    graphBuilder.clear();
    metricsCollector.reset();
  });

  it("Scenario: ingest documents, run RAG queries, and assert telemetry metrics reflect reality", async () => {
    // 1. Assert telemetry is clean initially
    let snap = metricsCollector.getSnapshot();
    expect(snap.ingestion.totalDocsIngested).toBe(0);
    expect(snap.ragReasoning.totalRequests).toBe(0);

    // 2. Perform a semantic ingestion
    await harvester.run({
      type: "semantic",
      payload: {
        docId: "doc-obs-hybrid-1",
        raw: "Chris Sorensen was born in Denmark. He worked at Ford Motor Company as a production expert."
      }
    });

    // 3. Assert telemetry reflects the ingestion count & rates
    snap = metricsCollector.getSnapshot();
    expect(snap.ingestion.totalDocsIngested).toBe(1);
    expect(snap.ingestion.docsPerMin).toBe(1);
    expect(snap.ingestion.extractorLatencies.semantic).toBeGreaterThanOrEqual(0);
    expect(snap.ingestion.extractorLatencies.relationship).toBeGreaterThanOrEqual(0);
    expect(snap.ingestion.extractorLatencies.topic).toBeGreaterThanOrEqual(0);

    // Assert vector index upserts count matches
    expect(snap.vectorIndex.totalUpserts).toBeGreaterThanOrEqual(1);

    // 4. Run a multi-hop RAG reasoning query
    const trace = await reasoningOrchestrator.reason("Identify the birthplace and career path of Chris Sorensen");
    
    // 5. Assert RAG query metrics are fully captured
    snap = metricsCollector.getSnapshot();
    expect(snap.ragReasoning.totalRequests).toBe(1);
    expect(snap.ragReasoning.requestsPerMin).toBe(1);
    expect(snap.ragReasoning.avgStagesPerQuery).toBeGreaterThan(0);
    expect(snap.ragReasoning.avgEvidenceCountPerQuery).toBeGreaterThan(0);
    expect(snap.ragReasoning.contradictionRate).toBe(0); // No contradiction in this simple profile

    // Assert vector query count is recorded
    expect(snap.vectorIndex.totalQueries).toBeGreaterThanOrEqual(1);
    expect(snap.vectorIndex.latencyHistogram.p50).toBeGreaterThanOrEqual(0);
  });
});
