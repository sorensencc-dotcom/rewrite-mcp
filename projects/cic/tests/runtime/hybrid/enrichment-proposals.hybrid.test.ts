import { describe, it, expect, beforeEach } from "vitest";
import { specRegistry } from "../../../src/cic/control-plane/spec-registry.js";
import { getTelemetrySink } from "../../../src/cic/control-plane/telemetry-sink.js";
import { ExtractorChain } from "../../../src/harvester/extractors/extractor-chain.js";
import { SemanticExtractor } from "../../../src/harvester/extractors/semanticExtractor.js";
import { InstinctProposer } from "../../../src/cic/control-plane/instinct-proposer.js";
import { SkillTelemetry, InstinctTelemetry } from "../../../src/cic/control-plane/telemetry-types.js";

describe("Scenario H - Post-Run Telemetry Enrichment & Analytical Instinct Proposer (Phase 2.2)", () => {
  beforeEach(async () => {
    specRegistry.loadAll();
    await getTelemetrySink().clear();
  });

  it("successfully enriches instinct telemetry with pipeline outcome, drift, and latency delta post-run", async () => {
    const chain = new ExtractorChain();
    chain.add(new SemanticExtractor());

    // Execute standard run with mock driftDelta
    const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
      docType: "bibliography",
      sourceFormat: "ris",
      driftDelta: -0.08 // reduction in drift!
    } as any);

    expect(outcome.chain_execution).toBe("completed");

    // Fetch the logged instinct telemetry
    const instinctEvents = await getTelemetrySink().queryInstincts();
    expect(instinctEvents.length).toBeGreaterThan(0);
    const enriched = instinctEvents[0];

    // Assert that post-run hooks enriched the properties
    expect(enriched.pipelineOutcome).toBe("success");
    expect(enriched.driftDelta).toBe(-0.08);
    expect(enriched.latencyDeltaMs).toBeDefined();
  });

  it("evaluates success, latency, and drift deltas to compute weighted impactScore and proposals metrics", () => {
    // Group A: Instinct Fired (with Instinct)
    // Run 1: success=true, latency=400ms, driftDelta=-0.06 (drift improvement!)
    const skillEvents: SkillTelemetry[] = [
      {
        runId: "run-with-1",
        pipeline: "documentary_ingest",
        stage: "evidence_pack",
        skillName: "extract_semantic_text",
        skillVersion: "1.0.0",
        tenantId: "default",
        region: "us-east-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        latencyMs: 400,
        inputSizeBytes: 100,
        outputSizeBytes: 200,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      },
      // Group B: Instinct Did Not Fire (Without Instinct)
      // Run 2: success=true, latency=800ms, driftDelta=0.0
      {
        runId: "run-without-1",
        pipeline: "documentary_ingest",
        stage: "evidence_pack",
        skillName: "extract_semantic_text",
        skillVersion: "1.0.0",
        tenantId: "default",
        region: "us-east-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        latencyMs: 800,
        inputSizeBytes: 100,
        outputSizeBytes: 200,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      }
    ];

    const instinctEvents: InstinctTelemetry[] = [
      {
        runId: "run-with-1",
        pipeline: "documentary_ingest",
        stage: "evidence_pack",
        instinctName: "prefer_ris_over_pdf_for_bibliography",
        instinctVersion: "0.3.0",
        tenantId: "default",
        region: "us-east-1",
        firedAt: new Date().toISOString(),
        skillsSelected: ["extract_semantic_text"],
        skillsAvoided: [],
        pipelineOutcome: "success",
        driftDelta: -0.06,
        latencyDeltaMs: -400
      }
    ];

    const proposer = new InstinctProposer(skillEvents, instinctEvents);
    const proposals = proposer.proposePatches();

    expect(proposals.length).toBe(1);
    const prop = proposals[0];
    expect(prop.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
    expect(prop.proposedVersion).toBe("0.4.0");
    
    // Verify weighted impactScore
    // latency delta = 800 - 400 = 400ms -> score points = 40
    // drift delta = 0.06 -> score points = 24
    // success delta = 0 -> score points = 0
    // base score = 30 -> total = 94!
    expect(prop.impactScore).toBe(94);

    // Verify detailed metrics annotations
    expect(prop.metricsBefore).toBeDefined();
    expect(prop.metricsBefore?.successRate).toBe(1.0);
    expect(prop.metricsBefore?.avgLatencyMs).toBe(800);
    expect(prop.metricsBefore?.avgDrift).toBe(0.0);

    expect(prop.metricsAfter).toBeDefined();
    expect(prop.metricsAfter?.successRate).toBe(1.0);
    expect(prop.metricsAfter?.avgLatencyMs).toBe(400);
    expect(prop.metricsAfter?.avgDrift).toBe(-0.06);
    expect(prop.rationale).toContain("Drift reduction delta: -0.060");
  });
});
