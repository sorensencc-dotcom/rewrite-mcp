"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const composer_js_1 = require("../../src/pms/v2/composer.js");
const pms_template_registry_js_1 = require("../../src/pms/pms.template-registry.js");
const conditional_js_1 = require("../../src/pms/v2/conditional.js");
const schema_js_1 = require("../../src/pms/v2/schema.js");
(0, vitest_1.describe)("PMS v2 Contract Tests", () => {
    let registry;
    let composer;
    (0, vitest_1.beforeEach)(() => {
        registry = new pms_template_registry_js_1.PMSTemplateRegistry();
        composer = new composer_js_1.PMSComposer(registry);
    });
    (0, vitest_1.describe)("Schema Validation", () => {
        (0, vitest_1.it)("successfully validates standard compositional v2 templates", () => {
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
            const result = (0, schema_js_1.validateTemplateV2)(valid);
            (0, vitest_1.expect)(result.template_id).toBe("valid_t1");
        });
        (0, vitest_1.it)("rejects templates missing required basic fields", () => {
            const invalid = {
                template_id: "invalid_t1",
                version: "2.0.0"
            };
            (0, vitest_1.expect)(() => (0, schema_js_1.validateTemplateV2)(invalid)).toThrow("Missing or invalid required field");
        });
        (0, vitest_1.it)("rejects templates missing both template content and parent reference", () => {
            const invalid = {
                template_id: "invalid_t2",
                name: "Test Template",
                version: "2.0.0",
                extractor_type: "custom",
                content_type: "semantic"
            };
            (0, vitest_1.expect)(() => (0, schema_js_1.validateTemplateV2)(invalid)).toThrow("Template must specify either a 'template' body or a 'parent'");
        });
    });
    (0, vitest_1.describe)("Conditional Block Evaluation", () => {
        const vars = {
            is_first_pass: true,
            has_context: false,
            flag_active: "true"
        };
        (0, vitest_1.it)("includes content when simple condition is true", () => {
            const template = "Header\n[[if is_first_pass]]Keep this content[[endif]]\nFooter";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).toContain("Keep this content");
        });
        (0, vitest_1.it)("prunes content when simple condition is false", () => {
            const template = "Header\n[[if has_context]]Remove this content[[endif]]\nFooter";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).not.toContain("Remove this content");
        });
        (0, vitest_1.it)("handles logical negation (!)", () => {
            const template = "[[if !has_context]]Context is missing[[endif]]";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).toBe("Context is missing");
        });
        (0, vitest_1.it)("handles logical AND (&&)", () => {
            const template = "[[if is_first_pass && !has_context]]AND is true[[endif]]";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).toBe("AND is true");
        });
        (0, vitest_1.it)("handles logical OR (||)", () => {
            const template = "[[if has_context || flag_active]]OR is true[[endif]]";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).toBe("OR is true");
        });
        (0, vitest_1.it)("iteratively resolves nested conditional statements from innermost out", () => {
            const template = "[[if is_first_pass]]Outer: [[if !has_context]]Inner Match[[endif]][[endif]]";
            const result = conditional_js_1.conditionalEvaluator.evaluate(template, vars);
            (0, vitest_1.expect)(result).toBe("Outer: Inner Match");
        });
    });
    (0, vitest_1.describe)("Inheritance and Overridable Blocks", () => {
        (0, vitest_1.it)("correctly inherits from base parent layout and replaces block blocks", async () => {
            const parent = {
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
            registry.register(child);
            const res = await composer.resolve("child_t", {});
            (0, vitest_1.expect)(res.metadata.error).toBeNull();
            (0, vitest_1.expect)(res.prompt).toBe("Header\nChild Overrides Content\nFooter");
        });
        (0, vitest_1.it)("keeps default parent block content if child does not override it", async () => {
            const parent = {
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
            registry.register(child);
            const res = await composer.resolve("child_t", {});
            (0, vitest_1.expect)(res.prompt).toBe("Header\nParent Main\nFooter");
        });
        (0, vitest_1.it)("fails gracefully and detects circular inheritance dependencies", async () => {
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
            registry.register(loopA);
            registry.register(loopB);
            const res = await composer.resolve("loop_a", {});
            (0, vitest_1.expect)(res.metadata.error).toContain("Circular template inheritance detected");
            (0, vitest_1.expect)(res.prompt).toBe("");
        });
    });
    (0, vitest_1.describe)("Vector Index Snippet Resolution", () => {
        (0, vitest_1.it)("substitutes rate-limited index snippet queries", async () => {
            const template = {
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
            (0, vitest_1.expect)(res.prompt).toContain("Snippet 1:");
            (0, vitest_1.expect)(res.prompt).toContain("Snippet 2:");
            (0, vitest_1.expect)(res.prompt).not.toContain("Snippet 3:");
        });
    });
    (0, vitest_1.describe)("Graceful Error Isolation", () => {
        (0, vitest_1.it)("captures missing standard variables in returned metadata error without throwing", async () => {
            const template = {
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
            (0, vitest_1.expect)(res.prompt).toBe("");
            (0, vitest_1.expect)(res.metadata.error).toContain("Required prompt template variable is missing");
        });
    });
});
//# sourceMappingURL=pms-v2.contract.test.js.map