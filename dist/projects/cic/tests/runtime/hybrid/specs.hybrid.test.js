"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const spec_registry_js_1 = require("../../../src/cic/control-plane/spec-registry.js");
const extractor_chain_js_1 = require("../../../src/harvester/extractors/extractor-chain.js");
const semanticExtractor_js_1 = require("../../../src/harvester/extractors/semanticExtractor.js");
const relationshipExtractor_js_1 = require("../../../src/harvester/extractors/relationshipExtractor.js");
class MockExtractor {
    async extract(input) {
        return { type: "mock_extractor", data: "ok" };
    }
}
(0, vitest_1.describe)("Scenario E - Declarative Configuration Specs (Skills, Instincts, Hooks, Rules)", () => {
    (0, vitest_1.beforeEach)(() => {
        spec_registry_js_1.specRegistry.loadAll();
        spec_registry_js_1.specRegistry.clearViolations();
    });
    (0, vitest_1.it)("successfully parses and registers Skills, Instincts, Hooks, and Rules from YAML", () => {
        const skills = spec_registry_js_1.specRegistry.getSkills();
        const instincts = spec_registry_js_1.specRegistry.getInstincts();
        const hooks = spec_registry_js_1.specRegistry.getHooks();
        const rules = spec_registry_js_1.specRegistry.getRules();
        (0, vitest_1.expect)(skills.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(instincts.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(hooks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(rules.length).toBeGreaterThan(0);
        const risSkill = skills.find(s => s.name === "extract_ris_metadata");
        (0, vitest_1.expect)(risSkill).toBeDefined();
        (0, vitest_1.expect)(risSkill?.determinism.is_pure).toBe(true);
        const bibliInstinct = instincts.find(i => i.name === "prefer_ris_over_pdf_for_bibliography");
        (0, vitest_1.expect)(bibliInstinct).toBeDefined();
        (0, vitest_1.expect)(bibliInstinct?.constraints.max_skill_fanout).toBe(2);
        const commitHook = hooks.find(h => h.name === "enforce_schema_before_commit");
        (0, vitest_1.expect)(commitHook).toBeDefined();
        (0, vitest_1.expect)(commitHook?.phase).toBe("before_pipeline_commit");
        const purityRule = rules.find(r => r.name === "no_nondeterministic_in_evidence_pack");
        (0, vitest_1.expect)(purityRule).toBeDefined();
        (0, vitest_1.expect)(purityRule?.enforcement).toBe("hard");
    });
    (0, vitest_1.it)("evaluates Instinct routing policies correctly based on document format", () => {
        // Evaluating bibliography with 'ris' format -> should prefer extract_ris_metadata and avoid extract_pdf_bibliography
        const risResult = spec_registry_js_1.specRegistry.evaluateInstincts("documentary_ingest", "bibliography", "ris");
        (0, vitest_1.expect)(risResult.prefer).toContain("extract_ris_metadata");
        (0, vitest_1.expect)(risResult.avoid).toContain("extract_pdf_bibliography");
        // Evaluating bibliography with 'pdf' format -> should prefer extract_pdf_bibliography
        const pdfResult = spec_registry_js_1.specRegistry.evaluateInstincts("documentary_ingest", "bibliography", "pdf");
        (0, vitest_1.expect)(pdfResult.prefer).toContain("extract_pdf_bibliography");
    });
    (0, vitest_1.it)("honors avoided skills by skipping skipped extractors in ExtractorChain", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        // We add SemanticExtractor (which maps to 'extract_semantic_text')
        // and RelationshipExtractor (which we will map to a avoided skill in this test)
        chain.add(new semanticExtractor_js_1.SemanticExtractor());
        chain.add(new relationshipExtractor_js_1.RelationshipExtractor());
        // Mock instinct to avoid extract_entity_relationships
        const origEvaluate = spec_registry_js_1.specRegistry.evaluateInstincts;
        spec_registry_js_1.specRegistry.evaluateInstincts = () => ({
            prefer: [],
            avoid: ["extract_entity_relationships"]
        });
        try {
            const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
                docType: "bibliography",
                sourceFormat: "ris"
            });
            // It should only have executed SemanticExtractor and NOT RelationshipExtractor
            (0, vitest_1.expect)(outcome.chain_execution).toBe("completed");
            (0, vitest_1.expect)(outcome.results.length).toBe(1);
            (0, vitest_1.expect)(outcome.results[0].type).toBe("semantic_extraction");
        }
        finally {
            // Revert mock
            spec_registry_js_1.specRegistry.evaluateInstincts = origEvaluate;
        }
    });
    (0, vitest_1.it)("triggers schema validation hooks and registers hard violations", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        chain.add(new semanticExtractor_js_1.SemanticExtractor());
        // Verify successful run under normal conditions
        const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
            docType: "bibliography",
            sourceFormat: "ris"
        });
        (0, vitest_1.expect)(outcome.chain_execution).toBe("completed");
        // Mock hook execution to trigger validation failure
        const badHook = spec_registry_js_1.specRegistry.getHooks().find(h => h.name === "enforce_schema_before_commit");
        if (badHook) {
            const origAction = badHook.behavior.action;
            badHook.behavior.action = "fail_mock_action"; // Will trigger target stage error or validator error
            try {
                await (0, vitest_1.expect)(chain.run("Sorensen", {
                    docType: "bibliography",
                    sourceFormat: "ris"
                })).rejects.toThrow("Pipeline aborted due to hook");
                // Verify violation registered
                const violations = spec_registry_js_1.specRegistry.getViolations();
                (0, vitest_1.expect)(violations.length).toBeGreaterThan(0);
                (0, vitest_1.expect)(violations[0].type).toBe("hook");
                (0, vitest_1.expect)(violations[0].severity).toBe("hard");
            }
            finally {
                badHook.behavior.action = origAction;
            }
        }
    });
    (0, vitest_1.it)("enforces declarative rules and restricts non-deterministic skills when constraint is hard", async () => {
        // We run the chain with a list of used skills.
        // 'extract_image_analysis' maps to ImageAnalyzer which has uses_llm = true, hence non-deterministic.
        (0, vitest_1.expect)(() => {
            spec_registry_js_1.specRegistry.validateRules("documentary_ingest", "evidence_pack", {
                skills_used: ["extract_semantic_text", "extract_image_analysis"]
            });
        }).toThrow("Non-deterministic skill 'extract_image_analysis' violates rule purity requirements");
        const violations = spec_registry_js_1.specRegistry.getViolations();
        (0, vitest_1.expect)(violations.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(violations[0].type).toBe("rule");
        (0, vitest_1.expect)(violations[0].severity).toBe("hard");
    });
});
//# sourceMappingURL=specs.hybrid.test.js.map