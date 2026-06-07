import { describe, it, expect, beforeEach } from "vitest";
import { specRegistry } from "../../../src/cic/control-plane/spec-registry.js";
import { getTelemetrySink } from "../../../src/cic/control-plane/telemetry-sink.js";
import { InstinctProposer } from "../../../src/cic/control-plane/instinct-proposer.js";
import { SkillTelemetry, InstinctTelemetry } from "../../../src/cic/control-plane/telemetry-types.js";

describe("Scenario G - Violations Heatmap (Option 1) & Comparative Proposals Engine (Option 3)", () => {
  beforeEach(async () => {
    specRegistry.loadAll();
    specRegistry.clearViolations();
    await getTelemetrySink().clear();
  });

  it("stores, filters, and aggregates rule violations into a structured heatmap grid", () => {
    // Register some mock violations under specific tenant contexts
    specRegistry.registerViolation({
      type: "rule",
      name: "no_nondeterministic_in_evidence_pack",
      message: "Non-deterministic skill 'extract_image_analysis' violates rules",
      severity: "hard",
      context: { pipeline: "documentary_ingest", tenantId: "tenant-alpha", region: "us-east-1" }
    });

    specRegistry.registerViolation({
      type: "rule",
      name: "no_nondeterministic_in_evidence_pack",
      message: "Non-deterministic skill 'extract_image_analysis' violates rules",
      severity: "soft",
      context: { pipeline: "documentary_ingest", tenantId: "tenant-alpha", region: "us-east-1" }
    });

    specRegistry.registerViolation({
      type: "rule",
      name: "no_nondeterministic_in_evidence_pack",
      message: "Non-deterministic skill violates rules",
      severity: "hard",
      context: { pipeline: "documentary_ingest", tenantId: "tenant-beta", region: "us-east-1" }
    });

    // Check querying with filters
    const alphaViolations = specRegistry.queryViolations({ tenantId: "tenant-alpha" });
    expect(alphaViolations.length).toBe(2);

    // Verify heatmap grid calculation logic (Option 1 transform)
    const violations = specRegistry.queryViolations({ limit: 1000 });
    const grid: Record<string, { hard: number; soft: number }> = {};

    for (const v of violations) {
      const tenant = v.context?.tenantId || "default";
      if (!grid[tenant]) {
        grid[tenant] = { hard: 0, soft: 0 };
      }
      if (v.severity === "hard") {
        grid[tenant].hard++;
      } else {
        grid[tenant].soft++;
      }
    }

    expect(grid["tenant-alpha"]).toBeDefined();
    expect(grid["tenant-alpha"].hard).toBe(1);
    expect(grid["tenant-alpha"].soft).toBe(1);
    expect(grid["tenant-beta"].hard).toBe(1);
  });

  it("compares runs with vs without instincts to propose WIDENING patches when metrics are positive", () => {
    // Generate skill events representing:
    // - 2 runs with instinct: success=true, latency=500ms
    // - 2 runs without instinct: success=true, latency=900ms (Instinct improves latency!)
    const skillEvents: SkillTelemetry[] = [
      // Run A (With Instinct)
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
        latencyMs: 500,
        inputSizeBytes: 100,
        outputSizeBytes: 200,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      },
      // Run B (Without Instinct)
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
        latencyMs: 900,
        inputSizeBytes: 100,
        outputSizeBytes: 200,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      }
    ];

    // InstinctEvents indicating run-with-1 triggered 'prefer_ris_over_pdf_for_bibliography'
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
        skillsAvoided: []
      }
    ];

    const proposer = new InstinctProposer(skillEvents, instinctEvents);
    const proposals = proposer.proposePatches();

    // Verify 'widen' proposal is generated
    const prop = proposals.find(p => p.instinctName === "prefer_ris_over_pdf_for_bibliography");
    expect(prop).toBeDefined();
    expect(prop?.proposedVersion).toBe("0.4.0");
    expect(prop?.diff.trigger.when.source_format_in).toContain("ris");
    expect(prop?.diff.trigger.when.source_format_in).toContain("xml");
    expect(prop?.impactScore).toBe(70);
    expect(prop?.rationale).toContain("successfully improves pipeline metrics");
  });

  it("compares runs with vs without instincts to propose NARROWING patches when metrics degrade", () => {
    // Generate skill events representing:
    // - Run A (With Instinct): failure! outcome=failure, latency=1500ms
    // - Run B (Without Instinct): success! outcome=success, latency=400ms
    const skillEvents: SkillTelemetry[] = [
      // Run A (With Instinct)
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
        latencyMs: 1500,
        inputSizeBytes: 100,
        outputSizeBytes: 200,
        outcome: "failure", // Failure!
        rulesEnforced: [],
        hooksFired: []
      },
      // Run B (Without Instinct)
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
        latencyMs: 400,
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
        skillsAvoided: []
      }
    ];

    const proposer = new InstinctProposer(skillEvents, instinctEvents);
    const proposals = proposer.proposePatches();

    // Verify 'narrow' proposal is generated
    const prop = proposals.find(p => p.instinctName === "prefer_ris_over_pdf_for_bibliography");
    expect(prop).toBeDefined();
    expect(prop?.proposedVersion).toBe("0.4.0");
    expect(prop?.diff.logic.routing_policy.if).toContain("doc.size_kb < 500");
    expect(prop?.impactScore).toBe(95);
    expect(prop?.rationale).toContain("introduces execution degradation");
  });
});
