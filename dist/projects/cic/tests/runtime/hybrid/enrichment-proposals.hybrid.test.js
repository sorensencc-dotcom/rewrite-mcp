"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const spec_registry_js_1 = require("../../../src/cic/control-plane/spec-registry.js");
const telemetry_sink_js_1 = require("../../../src/cic/control-plane/telemetry-sink.js");
const extractor_chain_js_1 = require("../../../src/harvester/extractors/extractor-chain.js");
const semanticExtractor_js_1 = require("../../../src/harvester/extractors/semanticExtractor.js");
const instinct_proposer_js_1 = require("../../../src/cic/control-plane/instinct-proposer.js");
(0, vitest_1.describe)("Scenario H - Post-Run Telemetry Enrichment & Analytical Instinct Proposer (Phase 2.2)", () => {
    (0, vitest_1.beforeEach)(async () => {
        spec_registry_js_1.specRegistry.loadAll();
        await (0, telemetry_sink_js_1.getTelemetrySink)().clear();
    });
    (0, vitest_1.it)("successfully enriches instinct telemetry with pipeline outcome, drift, and latency delta post-run", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        chain.add(new semanticExtractor_js_1.SemanticExtractor());
        // Execute standard run with mock driftDelta
        const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
            docType: "bibliography",
            sourceFormat: "ris",
            driftDelta: -0.08 // reduction in drift!
        });
        (0, vitest_1.expect)(outcome.chain_execution).toBe("completed");
        // Fetch the logged instinct telemetry
        const instinctEvents = await (0, telemetry_sink_js_1.getTelemetrySink)().queryInstincts();
        (0, vitest_1.expect)(instinctEvents.length).toBeGreaterThan(0);
        const enriched = instinctEvents[0];
        // Assert that post-run hooks enriched the properties
        (0, vitest_1.expect)(enriched.pipelineOutcome).toBe("success");
        (0, vitest_1.expect)(enriched.driftDelta).toBe(-0.08);
        (0, vitest_1.expect)(enriched.latencyDeltaMs).toBeDefined();
    });
    (0, vitest_1.it)("evaluates success, latency, and drift deltas to compute weighted impactScore and proposals metrics", () => {
        // Group A: Instinct Fired (with Instinct)
        // Run 1: success=true, latency=400ms, driftDelta=-0.06 (drift improvement!)
        const skillEvents = [
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
        const instinctEvents = [
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
        const proposer = new instinct_proposer_js_1.InstinctProposer(skillEvents, instinctEvents);
        const proposals = proposer.proposePatches();
        (0, vitest_1.expect)(proposals.length).toBe(1);
        const prop = proposals[0];
        (0, vitest_1.expect)(prop.instinctName).toBe("prefer_ris_over_pdf_for_bibliography");
        (0, vitest_1.expect)(prop.proposedVersion).toBe("0.4.0");
        // Verify weighted impactScore
        // latency delta = 800 - 400 = 400ms -> score points = 40
        // drift delta = 0.06 -> score points = 24
        // success delta = 0 -> score points = 0
        // base score = 30 -> total = 94!
        (0, vitest_1.expect)(prop.impactScore).toBe(94);
        // Verify detailed metrics annotations
        (0, vitest_1.expect)(prop.metricsBefore).toBeDefined();
        (0, vitest_1.expect)(prop.metricsBefore?.successRate).toBe(1.0);
        (0, vitest_1.expect)(prop.metricsBefore?.avgLatencyMs).toBe(800);
        (0, vitest_1.expect)(prop.metricsBefore?.avgDrift).toBe(0.0);
        (0, vitest_1.expect)(prop.metricsAfter).toBeDefined();
        (0, vitest_1.expect)(prop.metricsAfter?.successRate).toBe(1.0);
        (0, vitest_1.expect)(prop.metricsAfter?.avgLatencyMs).toBe(400);
        (0, vitest_1.expect)(prop.metricsAfter?.avgDrift).toBe(-0.06);
        (0, vitest_1.expect)(prop.rationale).toContain("Drift reduction delta: -0.060");
    });
});
//# sourceMappingURL=enrichment-proposals.hybrid.test.js.map