"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const telemetry_sink_js_1 = require("../../../src/cic/control-plane/telemetry-sink.js");
const spec_registry_js_1 = require("../../../src/cic/control-plane/spec-registry.js");
const extractor_chain_js_1 = require("../../../src/harvester/extractors/extractor-chain.js");
const semanticExtractor_js_1 = require("../../../src/harvester/extractors/semanticExtractor.js");
const instinct_proposer_js_1 = require("../../../src/cic/control-plane/instinct-proposer.js");
(0, vitest_1.describe)("Scenario F - SkillOps + InstinctOps Ingestion Telemetry Layer", () => {
    (0, vitest_1.beforeEach)(async () => {
        spec_registry_js_1.specRegistry.loadAll();
        await (0, telemetry_sink_js_1.getTelemetrySink)().clear();
    });
    (0, vitest_1.it)("records skill and instinct telemetry metrics during ingestion pipeline execution", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        chain.add(new semanticExtractor_js_1.SemanticExtractor());
        // Execute standard run
        const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
            docType: "bibliography",
            sourceFormat: "ris"
        });
        (0, vitest_1.expect)(outcome.chain_execution).toBe("completed");
        // Fetch and check telemetry
        const skillEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().querySkills();
        const instinctEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().queryInstincts();
        // Verify instincts emitted
        (0, vitest_1.expect)(instinctEvents.length).toBeGreaterThan(0);
        const instinct = instinctEvents[0];
        (0, vitest_1.expect)(instinct.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
        (0, vitest_1.expect)(instinct.skillsSelected).toContain("extract_semantic_text");
        (0, vitest_1.expect)(instinct.skillsAvoided).toContain("extract_pdf_bibliography");
        // Verify skills emitted
        (0, vitest_1.expect)(skillEvents.length).toBeGreaterThan(0);
        const skill = skillEvents[0];
        (0, vitest_1.expect)(skill.skillName).toBe("extract_semantic_text");
        (0, vitest_1.expect)(skill.skillVersion).toBe("1.0.0");
        (0, vitest_1.expect)(skill.outcome).toBe("success");
        (0, vitest_1.expect)(skill.latencyMs).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(skill.inputSizeBytes).toBeGreaterThan(0);
        (0, vitest_1.expect)(skill.outputSizeBytes).toBeGreaterThan(0);
        (0, vitest_1.expect)(skill.rulesEnforced).toContain("no_nondeterministic_in_evidence_pack");
        (0, vitest_1.expect)(skill.hooksFired).toContain("enforce_schema_before_commit");
        (0, vitest_1.expect)(skill.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
    });
    (0, vitest_1.it)("handles and logs skill telemetries for failure outcomes correctly", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        // Create an extractor that intentionally throws an error
        const faultyExtractor = {
            extract: async () => {
                throw new Error("Simulated LLM pipeline timeout error");
            }
        };
        chain.add(faultyExtractor);
        try {
            await chain.run("Input text");
            vitest_1.expect.fail("Should have thrown error");
        }
        catch (err) {
            (0, vitest_1.expect)(err.message).toContain("Simulated LLM pipeline timeout");
        }
        const skillEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().querySkills();
        (0, vitest_1.expect)(skillEvents.length).toBeGreaterThan(0);
        const failureEvent = skillEvents[0];
        (0, vitest_1.expect)(failureEvent.outcome).toBe("failure");
        (0, vitest_1.expect)(failureEvent.errorType).toBe("timeout");
        (0, vitest_1.expect)(failureEvent.errorMessageSnippet).toContain("Simulated LLM pipeline timeout error");
    });
    (0, vitest_1.it)("generates automated instinct patches in the Proposer based on degraded skill latency thresholds", () => {
        // Generate mock degraded telemetry logs: avg latency > 2000ms for impactScore = 95
        const skillEvents = [
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
        const instinctEvents = [];
        const proposer = new instinct_proposer_js_1.InstinctProposer(skillEvents, instinctEvents);
        const proposals = proposer.proposePatches();
        (0, vitest_1.expect)(proposals.length).toBe(1);
        (0, vitest_1.expect)(proposals[0].instinctName).toBe("avoid_degraded_extract_slow_metadata");
        (0, vitest_1.expect)(proposals[0].proposedVersion).toBe("0.1.0");
        (0, vitest_1.expect)(proposals[0].diff.routing_policy.avoid_skills).toContain("extract_slow_metadata");
        (0, vitest_1.expect)(proposals[0].impactScore).toBe(95);
        (0, vitest_1.expect)(proposals[0].rationale).toContain("exhibits high degradation");
    });
});
//# sourceMappingURL=telemetry.hybrid.test.js.map