import { describe, it, expect, beforeEach } from "vitest";
import { PMSComposer } from "../../src/pms/v2/composer.js";
import { PMSTemplateRegistry } from "../../src/pms/pms.template-registry.js";
import { PMSTemplate } from "../../src/pms/types.js";
import { conditionalEvaluator } from "../../src/pms/v2/conditional.js";
import { validateTemplateV2 } from "../../src/pms/v2/schema.js";

describe("PMS v2 Contract Tests", () => {
  let registry: PMSTemplateRegistry;
  let composer: PMSComposer;

  beforeEach(() => {
    registry = new PMSTemplateRegistry();
    composer = new PMSComposer(registry);
  });

  describe("Schema Validation", () => {
    it("successfully validates standard compositional v2 templates", () => {
      const valid = {
        template_id: "valid_t1",
        name: "Test Template",
        version: "2.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        template: "Source: {source}",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 1000,
        temperature: 0.3,
        top_p: 0.9,
        deprecated: false
      };
      const result = validateTemplateV2(valid);
      expect(result.template_id).toBe("valid_t1");
    });

    it("rejects templates missing required basic fields", () => {
      const invalid = {
        template_id: "invalid_t1",
        version: "2.0.0"
      };
      expect(() => validateTemplateV2(invalid)).toThrow("Missing or invalid required field");
    });

    it("rejects templates missing both template content and parent reference", () => {
      const invalid = {
        template_id: "invalid_t2",
        name: "Test Template",
        version: "2.0.0",
        extractor_type: "custom",
        content_type: "semantic"
      };
      expect(() => validateTemplateV2(invalid)).toThrow("Template must specify either a 'template' body or a 'parent'");
    });
  });

  describe("Conditional Block Evaluation", () => {
    const vars = {
      is_first_pass: true,
      has_context: false,
      flag_active: "true"
    };

    it("includes content when simple condition is true", () => {
      const template = "Header\n[[if is_first_pass]]Keep this content[[endif]]\nFooter";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).toContain("Keep this content");
    });

    it("prunes content when simple condition is false", () => {
      const template = "Header\n[[if has_context]]Remove this content[[endif]]\nFooter";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).not.toContain("Remove this content");
    });

    it("handles logical negation (!)", () => {
      const template = "[[if !has_context]]Context is missing[[endif]]";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).toBe("Context is missing");
    });

    it("handles logical AND (&&)", () => {
      const template = "[[if is_first_pass && !has_context]]AND is true[[endif]]";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).toBe("AND is true");
    });

    it("handles logical OR (||)", () => {
      const template = "[[if has_context || flag_active]]OR is true[[endif]]";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).toBe("OR is true");
    });

    it("iteratively resolves nested conditional statements from innermost out", () => {
      const template = "[[if is_first_pass]]Outer: [[if !has_context]]Inner Match[[endif]][[endif]]";
      const result = conditionalEvaluator.evaluate(template, vars);
      expect(result).toBe("Outer: Inner Match");
    });
  });

  describe("Inheritance and Overridable Blocks", () => {
    it("correctly inherits from base parent layout and replaces block blocks", async () => {
      const parent: PMSTemplate = {
        template_id: "parent_t",
        name: "Parent",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        template: "Header\n[[block:main]]Parent Main[[endblock]]\nFooter",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      const child = {
        template_id: "child_t",
        name: "Child",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        parent: "parent_t",
        blocks: {
          main: "Child Overrides Content"
        },
        template: "",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      registry.register(parent);
      registry.register(child as any);

      const res = await composer.resolve("child_t", {});
      expect(res.metadata.error).toBeNull();
      expect(res.prompt).toBe("Header\nChild Overrides Content\nFooter");
    });

    it("keeps default parent block content if child does not override it", async () => {
      const parent: PMSTemplate = {
        template_id: "parent_t",
        name: "Parent",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        template: "Header\n[[block:main]]Parent Main[[endblock]]\nFooter",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      const child = {
        template_id: "child_t",
        name: "Child",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        parent: "parent_t",
        blocks: {}, // Empty block overrides
        template: "",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      registry.register(parent);
      registry.register(child as any);

      const res = await composer.resolve("child_t", {});
      expect(res.prompt).toBe("Header\nParent Main\nFooter");
    });

    it("fails gracefully and detects circular inheritance dependencies", async () => {
      const loopA = {
        template_id: "loop_a",
        name: "Loop A",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        parent: "loop_b",
        template: "",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      const loopB = {
        template_id: "loop_b",
        name: "Loop B",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        parent: "loop_a",
        template: "",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      registry.register(loopA as any);
      registry.register(loopB as any);

      const res = await composer.resolve("loop_a", {});
      expect(res.metadata.error).toContain("Circular template inheritance detected");
      expect(res.prompt).toBe("");
    });
  });

  describe("Vector Index Snippet Resolution", () => {
    it("substitutes rate-limited index snippet queries", async () => {
      const template: PMSTemplate = {
        template_id: "index_t",
        name: "Index",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        template: "Snippets:\n[[index_lookup query=\"Charles Sorensen Detroit\" limit=2]]",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      registry.register(template);

      const res = await composer.resolve("index_t", {});
      expect(res.prompt).toContain("Snippet 1:");
      expect(res.prompt).toContain("Snippet 2:");
      expect(res.prompt).not.toContain("Snippet 3:");
    });
  });

  describe("Graceful Error Isolation", () => {
    it("captures missing standard variables in returned metadata error without throwing", async () => {
      const template: PMSTemplate = {
        template_id: "var_t",
        name: "Var",
        version: "1.0.0",
        extractor_type: "custom",
        content_type: "semantic",
        template: "Welcome {username}",
        created_at: "2026-05-30T00:00:00Z",
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9,
        deprecated: false
      };

      registry.register(template);

      // Call without username variable
      const res = await composer.resolve("var_t", {});
      expect(res.prompt).toBe("");
      expect(res.metadata.error).toContain("Required prompt template variable is missing");
    });
  });
});
