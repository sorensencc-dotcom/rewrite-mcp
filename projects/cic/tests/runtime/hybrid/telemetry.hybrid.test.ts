import { describe, it, expect, beforeEach } from "vitest";
import { getTelemetrySink, setTelemetrySink, DefaultTelemetrySink } from "../../../src/cic/control-plane/telemetry-sink.js";
import { specRegistry } from "../../../src/cic/control-plane/spec-registry.js";
import { ExtractorChain } from "../../../src/harvester/extractors/extractor-chain.js";
import { SemanticExtractor } from "../../../src/harvester/extractors/semanticExtractor.js";
import { RelationshipExtractor } from "../../../src/harvester/extractors/relationshipExtractor.js";
import { InstinctProposer } from "../../../src/cic/control-plane/instinct-proposer.js";
import { SkillTelemetry, InstinctTelemetry } from "../../../src/cic/control-plane/telemetry-types.js";

describe("Scenario F - SkillOps + InstinctOps Ingestion Telemetry Layer", () => {
  beforeEach(async () => {
    specRegistry.loadAll();
    await getTelemetrySink().clear();
  });

  it("records skill and instinct telemetry metrics during ingestion pipeline execution", async () => {
    const chain = new ExtractorChain();
    chain.add(new SemanticExtractor());

    // Execute standard run
    const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
      docType: "bibliography",
      sourceFormat: "ris"
    });

    expect(outcome.chain_execution).toBe("completed");

    // Fetch and check telemetry
    const skillEvents = await getTelemetrySink().querySkills();
    const instinctEvents = await getTelemetrySink().queryInstincts();

    // Verify instincts emitted
    expect(instinctEvents.length).toBeGreaterThan(0);
    const instinct = instinctEvents[0];
    expect(instinct.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
    expect(instinct.skillsSelected).toContain("extract_semantic_text");
    expect(instinct.skillsAvoided).toContain("extract_pdf_bibliography");

    // Verify skills emitted
    expect(skillEvents.length).toBeGreaterThan(0);
    const skill = skillEvents[0];
    expect(skill.skillName).toBe("extract_semantic_text");
    expect(skill.skillVersion).toBe("1.0.0");
    expect(skill.outcome).toBe("success");
    expect(skill.latencyMs).toBeGreaterThanOrEqual(0);
    expect(skill.inputSizeBytes).toBeGreaterThan(0);
    expect(skill.outputSizeBytes).toBeGreaterThan(0);
    expect(skill.rulesEnforced).toContain("no_nondeterministic_in_evidence_pack");
    expect(skill.hooksFired).toContain("enforce_schema_before_commit");
    expect(skill.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
  });

  it("handles and logs skill telemetries for failure outcomes correctly", async () => {
    const chain = new ExtractorChain();
    
    // Create an extractor that intentionally throws an error
    const faultyExtractor = {
      extract: async () => {
        throw new Error("Simulated LLM pipeline timeout error");
      }
    };
    chain.add(faultyExtractor);

    try {
      await chain.run("Input text");
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.message).toContain("Simulated LLM pipeline timeout");
    }

    const skillEvents = await getTelemetrySink().querySkills();
    expect(skillEvents.length).toBeGreaterThan(0);
    const failureEvent = skillEvents[0];
    expect(failureEvent.outcome).toBe("failure");
    expect(failureEvent.errorType).toBe("timeout");
    expect(failureEvent.errorMessageSnippet).toContain("Simulated LLM pipeline timeout error");
  });

  it("generates automated instinct patches in the Proposer based on degraded skill latency thresholds", () => {
    // Generate mock degraded telemetry logs: avg latency > 2000ms for impactScore = 95
    const skillEvents: SkillTelemetry[] = [
      {
        runId: "run-1",
        pipeline: "documentary_ingest",
        stage: "evidence_pack",
        skillName: "extract_slow_metadata",
        skillVersion: "1.0.0",
        tenantId: "default",
        region: "us-east-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        latencyMs: 2500, // Degraded latency!
        inputSizeBytes: 200,
        outputSizeBytes: 300,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      },
      {
        runId: "run-2",
        pipeline: "documentary_ingest",
        stage: "evidence_pack",
        skillName: "extract_slow_metadata",
        skillVersion: "1.0.0",
        tenantId: "default",
        region: "us-east-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        latencyMs: 2800, // Degraded latency!
        inputSizeBytes: 200,
        outputSizeBytes: 300,
        outcome: "success",
        rulesEnforced: [],
        hooksFired: []
      }
    ];

    const instinctEvents: InstinctTelemetry[] = [];
    const proposer = new InstinctProposer(skillEvents, instinctEvents);
    const proposals = proposer.proposePatches();

    expect(proposals.length).toBe(1);
    expect(proposals[0].instinctName).toBe("avoid_degraded_extract_slow_metadata");
    expect(proposals[0].proposedVersion).toBe("0.1.0");
    expect(proposals[0].diff.routing_policy.avoid_skills).toContain("extract_slow_metadata");
    expect(proposals[0].impactScore).toBe(95);
    expect(proposals[0].rationale).toContain("exhibits high degradation");
  });
});
