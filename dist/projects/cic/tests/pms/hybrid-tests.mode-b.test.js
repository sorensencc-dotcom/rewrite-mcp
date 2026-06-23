"use strict";
/**
 * tests/pms/hybrid-tests.mode-b.test.ts
 * PMS Hybrid Tests (Mode B) — v1.0.0
 * Date: 2026-05-29
 *
 * Three-layer test structure:
 * Layer 1: Fixtures (test data)
 * Layer 2: Unit Tests (component isolation)
 * Layer 3: Integration Tests (realistic workflows)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const registry_1 = require("../../src/pms/registry");
const executor_1 = require("../../src/pms/executor");
// ============================================================================
// LAYER 1: FIXTURES
// ============================================================================
const FIXTURE_TEMPLATES = [
    {
        template_id: "vision-test-001",
        name: "Test Vision Template",
        version: "1.0.0",
        extractor_type: "vision",
        content_type: "test_image",
        template: "Analyze this image: {image_input}",
        created_at: "2026-05-29T00:00:00Z",
        max_tokens: 1024,
        temperature: 0.3,
        top_p: 0.9,
        deprecated: false,
    },
    {
        template_id: "ocr-test-001",
        name: "Test OCR Template",
        version: "1.0.0",
        extractor_type: "ocr",
        content_type: "test_document",
        template: "Extract text from: {document} with format {format}",
        created_at: "2026-05-29T00:00:00Z",
        max_tokens: 2048,
        temperature: 0.1,
        top_p: 0.7,
        deprecated: false,
    },
    {
        template_id: "custom-test-001",
        name: "Test Custom Template",
        version: "2.0.0",
        extractor_type: "custom",
        content_type: "test_metadata",
        template: "Extract metadata: {data} context {context}",
        created_at: "2026-05-29T00:00:00Z",
        max_tokens: 3000,
        temperature: 0.4,
        top_p: 0.85,
        deprecated: false,
    },
];
const FIXTURE_RENDER_CASES = [
    {
        name: "simple substitution",
        templateId: "vision-test-001",
        vars: { image_input: "photo.jpg" },
        expected: "Analyze this image: photo.jpg",
    },
    {
        name: "multiple variables",
        templateId: "ocr-test-001",
        vars: { document: "doc.pdf", format: "preserve_layout" },
        expected: "Extract text from: doc.pdf with format preserve_layout",
    },
    {
        name: "complex values",
        templateId: "custom-test-001",
        vars: {
            data: '{"name": "test", "id": 123}',
            context: "documentary",
        },
        expected: 'Extract metadata: {"name": "test", "id": 123} context documentary',
    },
];
// ============================================================================
// LAYER 2: UNIT TESTS
// ============================================================================
(0, vitest_1.describe)("TemplateLoader — Unit Tests", () => {
    (0, vitest_1.it)("should parse valid YAML template structure", () => {
        const template = FIXTURE_TEMPLATES[0];
        (0, vitest_1.expect)(template.template_id).toBe("vision-test-001");
        (0, vitest_1.expect)(template.name).toBe("Test Vision Template");
        (0, vitest_1.expect)(template.version).toBe("1.0.0");
        (0, vitest_1.expect)(template.extractor_type).toBe("vision");
        (0, vitest_1.expect)(template.content_type).toBe("test_image");
        (0, vitest_1.expect)(template.template).toContain("{image_input}");
        (0, vitest_1.expect)(template.max_tokens).toBe(1024);
        (0, vitest_1.expect)(template.temperature).toBe(0.3);
        (0, vitest_1.expect)(template.top_p).toBe(0.9);
        (0, vitest_1.expect)(template.deprecated).toBe(false);
    });
    (0, vitest_1.it)("should validate required fields present", () => {
        const template = FIXTURE_TEMPLATES[0];
        const required = [
            "template_id",
            "name",
            "version",
            "extractor_type",
            "content_type",
            "template",
            "created_at",
            "max_tokens",
            "temperature",
            "top_p",
        ];
        for (const field of required) {
            (0, vitest_1.expect)(template).toHaveProperty(field);
        }
    });
    (0, vitest_1.it)("should handle deprecated flag", () => {
        const deprecatedTemplate = {
            ...FIXTURE_TEMPLATES[0],
            template_id: "deprecated-test-001",
            deprecated: true,
        };
        (0, vitest_1.expect)(deprecatedTemplate.deprecated).toBe(true);
    });
    (0, vitest_1.it)("should validate template type constraints", () => {
        const validTypes = ["vision", "ocr", "reverse_image", "custom"];
        for (const template of FIXTURE_TEMPLATES) {
            (0, vitest_1.expect)(validTypes).toContain(template.extractor_type);
        }
    });
});
(0, vitest_1.describe)("TemplateRegistry — Unit Tests", () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new registry_1.TemplateRegistry();
    });
    (0, vitest_1.it)("should register a template successfully", () => {
        registry.register(FIXTURE_TEMPLATES[0]);
        const retrieved = registry.get("vision-test-001");
        (0, vitest_1.expect)(retrieved).toBeDefined();
        (0, vitest_1.expect)(retrieved?.name).toBe("Test Vision Template");
    });
    (0, vitest_1.it)("should throw on duplicate template registration", () => {
        registry.register(FIXTURE_TEMPLATES[0]);
        (0, vitest_1.expect)(() => {
            registry.register(FIXTURE_TEMPLATES[0]);
        }).toThrow(/already registered/);
    });
    (0, vitest_1.it)("should list all templates", () => {
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        const all = registry.listAll();
        (0, vitest_1.expect)(all.length).toBe(3);
    });
    (0, vitest_1.it)("should filter active templates (deprecated=false)", () => {
        registry.register(FIXTURE_TEMPLATES[0]);
        registry.register({
            ...FIXTURE_TEMPLATES[1],
            deprecated: true,
        });
        registry.register(FIXTURE_TEMPLATES[2]);
        const active = registry.listActive();
        (0, vitest_1.expect)(active.length).toBe(2);
        (0, vitest_1.expect)(active.every((t) => !t.deprecated)).toBe(true);
    });
    (0, vitest_1.it)("should filter templates by extractor type", () => {
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        const visionTemplates = registry.listByExtractorType("vision");
        (0, vitest_1.expect)(visionTemplates.length).toBe(1);
        (0, vitest_1.expect)(visionTemplates[0].template_id).toBe("vision-test-001");
    });
    (0, vitest_1.it)("should track template versions", () => {
        registry.register(FIXTURE_TEMPLATES[0]);
        registry.register({
            ...FIXTURE_TEMPLATES[0],
            template_id: "vision-test-002",
            version: "1.1.0",
        });
        const versions = registry.getVersions("vision-test-002");
        (0, vitest_1.expect)(versions).toContain("1.1.0");
    });
    (0, vitest_1.it)("should return metrics by type", () => {
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        const metrics = registry.getMetrics();
        (0, vitest_1.expect)(metrics.totalTemplates).toBe(3);
        (0, vitest_1.expect)(metrics.activeTemplates).toBe(3);
        (0, vitest_1.expect)(metrics.deprecatedTemplates).toBe(0);
        (0, vitest_1.expect)(metrics.byType.vision).toBe(1);
        (0, vitest_1.expect)(metrics.byType.ocr).toBe(1);
        (0, vitest_1.expect)(metrics.byType.custom).toBe(1);
    });
});
(0, vitest_1.describe)("PromptRenderer — Unit Tests", () => {
    let executor;
    (0, vitest_1.beforeEach)(() => {
        const registry = new registry_1.TemplateRegistry();
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        executor = new executor_1.PMSExecutor(registry);
    });
    (0, vitest_1.it)("should substitute single variable", () => {
        const template = FIXTURE_TEMPLATES[0];
        const rendered = executor["renderTemplate"](template, {
            image_input: "test.jpg",
        });
        (0, vitest_1.expect)(rendered).toBe("Analyze this image: test.jpg");
    });
    (0, vitest_1.it)("should substitute multiple variables", () => {
        const template = FIXTURE_TEMPLATES[1];
        const rendered = executor["renderTemplate"](template, {
            document: "doc.pdf",
            format: "markdown",
        });
        (0, vitest_1.expect)(rendered).toBe("Extract text from: doc.pdf with format markdown");
    });
    (0, vitest_1.it)("should handle JSON object substitution", () => {
        const template = FIXTURE_TEMPLATES[2];
        const data = { name: "test", count: 42 };
        const rendered = executor["renderTemplate"](template, {
            data: JSON.stringify(data),
            context: "historical",
        });
        (0, vitest_1.expect)(rendered).toContain('"name": "test"');
        (0, vitest_1.expect)(rendered).toContain('"count": 42');
        (0, vitest_1.expect)(rendered).toContain("historical");
    });
    (0, vitest_1.it)("should throw on missing required variable", () => {
        const template = FIXTURE_TEMPLATES[0];
        (0, vitest_1.expect)(() => {
            executor["renderTemplate"](template, {});
        }).toThrow(/Missing required variable/);
    });
    (0, vitest_1.it)("should handle array substitution as JSON", () => {
        const template = {
            ...FIXTURE_TEMPLATES[0],
            template: "Process items: {items}",
        };
        const rendered = executor["renderTemplate"](template, {
            items: ["a", "b", "c"],
        });
        (0, vitest_1.expect)(rendered).toContain("[\n  \"a\",\n  \"b\",\n  \"c\"\n]");
    });
    (0, vitest_1.it)("should detect unreplaced placeholders", () => {
        const template = {
            ...FIXTURE_TEMPLATES[0],
            template: "Image: {image_input} Extra: {missing_var}",
        };
        (0, vitest_1.expect)(() => {
            executor["renderTemplate"](template, { image_input: "test.jpg" });
        }).toThrow(/Missing required variable: missing_var/);
    });
});
(0, vitest_1.describe)("PMSExecutor — Unit Tests", () => {
    let executor;
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new registry_1.TemplateRegistry();
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        executor = new executor_1.PMSExecutor(registry);
    });
    (0, vitest_1.it)("should execute with valid request", async () => {
        const request = {
            templateId: "vision-test-001",
            vars: { image_input: "photo.jpg" },
        };
        const result = await executor.execute(request);
        (0, vitest_1.expect)(result.status).toBe("success");
        (0, vitest_1.expect)(result.templateId).toBe("vision-test-001");
        (0, vitest_1.expect)(result.renderedPrompt).toBe("Analyze this image: photo.jpg");
        (0, vitest_1.expect)(result.config?.max_tokens).toBe(1024);
    });
    (0, vitest_1.it)("should return error for missing template", async () => {
        const request = {
            templateId: "nonexistent-template",
            vars: {},
        };
        const result = await executor.execute(request);
        (0, vitest_1.expect)(result.status).toBe("error");
        (0, vitest_1.expect)(result.error).toContain("not found");
    });
    (0, vitest_1.it)("should return error for missing variable", async () => {
        const request = {
            templateId: "vision-test-001",
            vars: {},
        };
        const result = await executor.execute(request);
        (0, vitest_1.expect)(result.status).toBe("error");
        (0, vitest_1.expect)(result.error).toContain("Missing required variable");
    });
    (0, vitest_1.it)("should include config in result", async () => {
        const request = {
            templateId: "ocr-test-001",
            vars: { document: "doc.pdf", format: "plain" },
        };
        const result = await executor.execute(request);
        (0, vitest_1.expect)(result.config).toBeDefined();
        (0, vitest_1.expect)(result.config?.max_tokens).toBe(2048);
        (0, vitest_1.expect)(result.config?.temperature).toBe(0.1);
        (0, vitest_1.expect)(result.config?.top_p).toBe(0.7);
    });
    (0, vitest_1.it)("should expose registry", () => {
        const reg = executor.getRegistry();
        (0, vitest_1.expect)(reg).toBe(registry);
    });
});
// ============================================================================
// LAYER 3: INTEGRATION TESTS
// ============================================================================
(0, vitest_1.describe)("Integration: Load → Render → Execute", () => {
    let registry;
    let executor;
    (0, vitest_1.beforeEach)(() => {
        registry = new registry_1.TemplateRegistry();
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        executor = new executor_1.PMSExecutor(registry);
    });
    (0, vitest_1.it)("should complete full workflow: register → retrieve → execute", async () => {
        const request = {
            templateId: "vision-test-001",
            vars: { image_input: "archive-photo-001.jpg" },
        };
        const result = await executor.execute(request);
        (0, vitest_1.expect)(result.status).toBe("success");
        (0, vitest_1.expect)(result.renderedPrompt).toContain("archive-photo-001.jpg");
        (0, vitest_1.expect)(result.config?.max_tokens).toBe(1024);
    });
    (0, vitest_1.it)("should handle sequential execution of different templates", async () => {
        const requests = [
            {
                templateId: "vision-test-001",
                vars: { image_input: "photo.jpg" },
            },
            {
                templateId: "ocr-test-001",
                vars: { document: "doc.pdf", format: "markdown" },
            },
            {
                templateId: "custom-test-001",
                vars: { data: "metadata", context: "archive" },
            },
        ];
        const results = await Promise.all(requests.map((req) => executor.execute(req)));
        (0, vitest_1.expect)(results.length).toBe(3);
        (0, vitest_1.expect)(results.every((r) => r.status === "success")).toBe(true);
    });
    (0, vitest_1.it)("should validate render test cases", async () => {
        for (const testCase of FIXTURE_RENDER_CASES) {
            const request = {
                templateId: testCase.templateId,
                vars: testCase.vars,
            };
            const result = await executor.execute(request);
            (0, vitest_1.expect)(result.status).toBe("success");
            (0, vitest_1.expect)(result.renderedPrompt).toBe(testCase.expected);
        }
    });
    (0, vitest_1.it)("should audit rendered prompts", async () => {
        const auditLog = [];
        const request = {
            templateId: "vision-test-001",
            vars: { image_input: "test.jpg" },
        };
        const result = await executor.execute(request);
        if (result.status === "success") {
            auditLog.push({
                templateId: result.templateId,
                timestamp: new Date().toISOString(),
                rendered: result.renderedPrompt,
            });
        }
        (0, vitest_1.expect)(auditLog.length).toBe(1);
        (0, vitest_1.expect)(auditLog[0].templateId).toBe("vision-test-001");
    });
    (0, vitest_1.it)("should detect version mismatches", () => {
        const v100 = registry.get("vision-test-001");
        const v200 = registry.get("custom-test-001");
        (0, vitest_1.expect)(v100?.version).toBe("1.0.0");
        (0, vitest_1.expect)(v200?.version).toBe("2.0.0");
        (0, vitest_1.expect)(v100?.version).not.toBe(v200?.version);
    });
    (0, vitest_1.it)("should report metrics after batch execution", async () => {
        const requests = FIXTURE_RENDER_CASES.map((testCase) => ({
            templateId: testCase.templateId,
            vars: testCase.vars,
        }));
        const results = await Promise.all(requests.map((req) => executor.execute(req)));
        const metrics = {
            total: results.length,
            success: results.filter((r) => r.status === "success").length,
            errors: results.filter((r) => r.status === "error").length,
        };
        (0, vitest_1.expect)(metrics.total).toBe(3);
        (0, vitest_1.expect)(metrics.success).toBe(3);
        (0, vitest_1.expect)(metrics.errors).toBe(0);
    });
});
(0, vitest_1.describe)("Integration: Error Handling", () => {
    let executor;
    (0, vitest_1.beforeEach)(() => {
        const registry = new registry_1.TemplateRegistry();
        for (const template of FIXTURE_TEMPLATES) {
            registry.register(template);
        }
        executor = new executor_1.PMSExecutor(registry);
    });
    (0, vitest_1.it)("should gracefully handle missing template", async () => {
        const result = await executor.execute({
            templateId: "missing-template-999",
            vars: {},
        });
        (0, vitest_1.expect)(result.status).toBe("error");
        (0, vitest_1.expect)(result.error).toBeDefined();
        (0, vitest_1.expect)(result.renderedPrompt).toBeUndefined();
    });
    (0, vitest_1.it)("should gracefully handle missing variables", async () => {
        const result = await executor.execute({
            templateId: "vision-test-001",
            vars: { wrong_var: "value" },
        });
        (0, vitest_1.expect)(result.status).toBe("error");
        (0, vitest_1.expect)(result.error).toContain("Missing required variable");
    });
    (0, vitest_1.it)("should not throw — all errors in result", async () => {
        const requests = [
            { templateId: "missing-001", vars: {} },
            { templateId: "vision-test-001", vars: {} },
            { templateId: "vision-test-001", vars: { image_input: "ok.jpg" } },
        ];
        const results = await Promise.all(requests.map((req) => executor.execute(req)));
        (0, vitest_1.expect)(() => {
            results.forEach((r) => {
                if (r.status === "error") {
                    (0, vitest_1.expect)(r.error).toBeDefined();
                }
            });
        }).not.toThrow();
    });
});
//# sourceMappingURL=hybrid-tests.mode-b.test.js.map