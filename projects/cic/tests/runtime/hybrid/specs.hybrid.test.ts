import { describe, it, expect, beforeEach } from "vitest";
import { specRegistry } from "../../../src/cic/control-plane/spec-registry.js";
import { ExtractorChain } from "../../../src/harvester/extractors/extractor-chain.js";
import { SemanticExtractor } from "../../../src/harvester/extractors/semanticExtractor.js";
import { RelationshipExtractor } from "../../../src/harvester/extractors/relationshipExtractor.js";
import { TopicExtractor } from "../../../src/harvester/extractors/topicExtractor.js";

class MockExtractor {
  async extract(input: any) {
    return { type: "mock_extractor", data: "ok" };
  }
}

describe("Scenario E - Declarative Configuration Specs (Skills, Instincts, Hooks, Rules)", () => {
  beforeEach(() => {
    specRegistry.loadAll();
    specRegistry.clearViolations();
  });

  it("successfully parses and registers Skills, Instincts, Hooks, and Rules from YAML", () => {
    const skills = specRegistry.getSkills();
    const instincts = specRegistry.getInstincts();
    const hooks = specRegistry.getHooks();
    const rules = specRegistry.getRules();

    expect(skills.length).toBeGreaterThan(0);
    expect(instincts.length).toBeGreaterThan(0);
    expect(hooks.length).toBeGreaterThan(0);
    expect(rules.length).toBeGreaterThan(0);

    const risSkill = skills.find(s => s.name === "extract_ris_metadata");
    expect(risSkill).toBeDefined();
    expect(risSkill?.determinism.is_pure).toBe(true);

    const bibliInstinct = instincts.find(i => i.name === "prefer_ris_over_pdf_for_bibliography");
    expect(bibliInstinct).toBeDefined();
    expect(bibliInstinct?.constraints.max_skill_fanout).toBe(2);

    const commitHook = hooks.find(h => h.name === "enforce_schema_before_commit");
    expect(commitHook).toBeDefined();
    expect(commitHook?.phase).toBe("before_pipeline_commit");

    const purityRule = rules.find(r => r.name === "no_nondeterministic_in_evidence_pack");
    expect(purityRule).toBeDefined();
    expect(purityRule?.enforcement).toBe("hard");
  });

  it("evaluates Instinct routing policies correctly based on document format", () => {
    // Evaluating bibliography with 'ris' format -> should prefer extract_ris_metadata and avoid extract_pdf_bibliography
    const risResult = specRegistry.evaluateInstincts(
      "documentary_ingest",
      "bibliography",
      "ris"
    );
    expect(risResult.prefer).toContain("extract_ris_metadata");
    expect(risResult.avoid).toContain("extract_pdf_bibliography");

    // Evaluating bibliography with 'pdf' format -> should prefer extract_pdf_bibliography
    const pdfResult = specRegistry.evaluateInstincts(
      "documentary_ingest",
      "bibliography",
      "pdf"
    );
    expect(pdfResult.prefer).toContain("extract_pdf_bibliography");
  });

  it("honors avoided skills by skipping skipped extractors in ExtractorChain", async () => {
    const chain = new ExtractorChain();
    
    // We add SemanticExtractor (which maps to 'extract_semantic_text')
    // and RelationshipExtractor (which we will map to a avoided skill in this test)
    chain.add(new SemanticExtractor());
    chain.add(new RelationshipExtractor());

    // Mock instinct to avoid extract_entity_relationships
    const origEvaluate = specRegistry.evaluateInstincts;
    specRegistry.evaluateInstincts = () => ({
      prefer: [],
      avoid: ["extract_entity_relationships"]
    });

    try {
      const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
        docType: "bibliography",
        sourceFormat: "ris"
      });

      // It should only have executed SemanticExtractor and NOT RelationshipExtractor
      expect(outcome.chain_execution).toBe("completed");
      expect(outcome.results.length).toBe(1);
      expect(outcome.results[0].type).toBe("semantic_extraction");
    } finally {
      // Revert mock
      specRegistry.evaluateInstincts = origEvaluate;
    }
  });

  it("triggers schema validation hooks and registers hard violations", async () => {
    const chain = new ExtractorChain();
    chain.add(new SemanticExtractor());

    // Verify successful run under normal conditions
    const outcome = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
      docType: "bibliography",
      sourceFormat: "ris"
    });
    expect(outcome.chain_execution).toBe("completed");

    // Mock hook execution to trigger validation failure
    const badHook = specRegistry.getHooks().find(h => h.name === "enforce_schema_before_commit");
    if (badHook) {
      const origAction = badHook.behavior.action;
      badHook.behavior.action = "fail_mock_action"; // Will trigger target stage error or validator error
      
      try {
        await expect(chain.run("Sorensen", {
          docType: "bibliography",
          sourceFormat: "ris"
        })).rejects.toThrow("Pipeline aborted due to hook");

        // Verify violation registered
        const violations = specRegistry.getViolations();
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].type).toBe("hook");
        expect(violations[0].severity).toBe("hard");
      } finally {
        badHook.behavior.action = origAction;
      }
    }
  });

  it("enforces declarative rules and restricts non-deterministic skills when constraint is hard", async () => {
    // We run the chain with a list of used skills.
    // 'extract_image_analysis' maps to ImageAnalyzer which has uses_llm = true, hence non-deterministic.
    expect(() => {
      specRegistry.validateRules("documentary_ingest", "evidence_pack", {
        skills_used: ["extract_semantic_text", "extract_image_analysis"]
      });
    }).toThrow("Non-deterministic skill 'extract_image_analysis' violates rule purity requirements");

    const violations = specRegistry.getViolations();
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe("rule");
    expect(violations[0].severity).toBe("hard");
  });
});
