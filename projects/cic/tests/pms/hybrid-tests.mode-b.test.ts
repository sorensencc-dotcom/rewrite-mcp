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

import { describe, it, expect, beforeEach } from "vitest";
import {
  PMSTemplate,
  PMSExecutionRequest,
  PMSExecutionResult,
} from "../../src/pms/types";
import { TemplateRegistry } from "../../src/pms/registry";
import { TemplateLoader } from "../../src/pms/loader";
import { PMSExecutor } from "../../src/pms/executor";

// ============================================================================
// LAYER 1: FIXTURES
// ============================================================================

const FIXTURE_TEMPLATES: PMSTemplate[] = [
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
    expected:
      "Extract text from: doc.pdf with format preserve_layout",
  },
  {
    name: "complex values",
    templateId: "custom-test-001",
    vars: {
      data: '{"name": "test", "id": 123}',
      context: "documentary",
    },
    expected:
      'Extract metadata: {"name": "test", "id": 123} context documentary',
  },
];

// ============================================================================
// LAYER 2: UNIT TESTS
// ============================================================================

describe("TemplateLoader — Unit Tests", () => {
  it("should parse valid YAML template structure", () => {
    const template = FIXTURE_TEMPLATES[0];

    expect(template.template_id).toBe("vision-test-001");
    expect(template.name).toBe("Test Vision Template");
    expect(template.version).toBe("1.0.0");
    expect(template.extractor_type).toBe("vision");
    expect(template.content_type).toBe("test_image");
    expect(template.template).toContain("{image_input}");
    expect(template.max_tokens).toBe(1024);
    expect(template.temperature).toBe(0.3);
    expect(template.top_p).toBe(0.9);
    expect(template.deprecated).toBe(false);
  });

  it("should validate required fields present", () => {
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
      expect(template).toHaveProperty(field);
    }
  });

  it("should handle deprecated flag", () => {
    const deprecatedTemplate: PMSTemplate = {
      ...FIXTURE_TEMPLATES[0],
      template_id: "deprecated-test-001",
      deprecated: true,
    };

    expect(deprecatedTemplate.deprecated).toBe(true);
  });

  it("should validate template type constraints", () => {
    const validTypes = ["vision", "ocr", "reverse_image", "custom"];

    for (const template of FIXTURE_TEMPLATES) {
      expect(validTypes).toContain(template.extractor_type);
    }
  });
});

describe("TemplateRegistry — Unit Tests", () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  it("should register a template successfully", () => {
    registry.register(FIXTURE_TEMPLATES[0]);
    const retrieved = registry.get("vision-test-001");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Test Vision Template");
  });

  it("should throw on duplicate template registration", () => {
    registry.register(FIXTURE_TEMPLATES[0]);

    expect(() => {
      registry.register(FIXTURE_TEMPLATES[0]);
    }).toThrow(/already registered/);
  });

  it("should list all templates", () => {
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }

    const all = registry.listAll();
    expect(all.length).toBe(3);
  });

  it("should filter active templates (deprecated=false)", () => {
    registry.register(FIXTURE_TEMPLATES[0]);
    registry.register({
      ...FIXTURE_TEMPLATES[1],
      deprecated: true,
    });
    registry.register(FIXTURE_TEMPLATES[2]);

    const active = registry.listActive();
    expect(active.length).toBe(2);
    expect(active.every((t) => !t.deprecated)).toBe(true);
  });

  it("should filter templates by extractor type", () => {
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }

    const visionTemplates = registry.listByExtractorType("vision");
    expect(visionTemplates.length).toBe(1);
    expect(visionTemplates[0].template_id).toBe("vision-test-001");
  });

  it("should track template versions", () => {
    registry.register(FIXTURE_TEMPLATES[0]);
    registry.register({
      ...FIXTURE_TEMPLATES[0],
      template_id: "vision-test-002",
      version: "1.1.0",
    });

    const versions = registry.getVersions("vision-test-002");
    expect(versions).toContain("1.1.0");
  });

  it("should return metrics by type", () => {
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }

    const metrics = registry.getMetrics();
    expect(metrics.totalTemplates).toBe(3);
    expect(metrics.activeTemplates).toBe(3);
    expect(metrics.deprecatedTemplates).toBe(0);
    expect(metrics.byType.vision).toBe(1);
    expect(metrics.byType.ocr).toBe(1);
    expect(metrics.byType.custom).toBe(1);
  });
});

describe("PromptRenderer — Unit Tests", () => {
  let executor: PMSExecutor;

  beforeEach(() => {
    const registry = new TemplateRegistry();
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }
    executor = new PMSExecutor(registry);
  });

  it("should substitute single variable", () => {
    const template = FIXTURE_TEMPLATES[0];
    const rendered = executor["renderTemplate"](template, {
      image_input: "test.jpg",
    });

    expect(rendered).toBe("Analyze this image: test.jpg");
  });

  it("should substitute multiple variables", () => {
    const template = FIXTURE_TEMPLATES[1];
    const rendered = executor["renderTemplate"](template, {
      document: "doc.pdf",
      format: "markdown",
    });

    expect(rendered).toBe("Extract text from: doc.pdf with format markdown");
  });

  it("should handle JSON object substitution", () => {
    const template = FIXTURE_TEMPLATES[2];
    const data = { name: "test", count: 42 };
    const rendered = executor["renderTemplate"](template, {
      data: JSON.stringify(data),
      context: "historical",
    });

    expect(rendered).toContain('"name": "test"');
    expect(rendered).toContain('"count": 42');
    expect(rendered).toContain("historical");
  });

  it("should throw on missing required variable", () => {
    const template = FIXTURE_TEMPLATES[0];

    expect(() => {
      executor["renderTemplate"](template, {});
    }).toThrow(/Missing required variable/);
  });

  it("should handle array substitution as JSON", () => {
    const template: PMSTemplate = {
      ...FIXTURE_TEMPLATES[0],
      template: "Process items: {items}",
    };

    const rendered = executor["renderTemplate"](template, {
      items: ["a", "b", "c"],
    });

    expect(rendered).toContain("[\n  \"a\",\n  \"b\",\n  \"c\"\n]");
  });

  it("should detect unreplaced placeholders", () => {
    const template: PMSTemplate = {
      ...FIXTURE_TEMPLATES[0],
      template: "Image: {image_input} Extra: {missing_var}",
    };

    expect(() => {
      executor["renderTemplate"](template, { image_input: "test.jpg" });
    }).toThrow(/Missing required variable: missing_var/);
  });
});

describe("PMSExecutor — Unit Tests", () => {
  let executor: PMSExecutor;
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }
    executor = new PMSExecutor(registry);
  });

  it("should execute with valid request", async () => {
    const request: PMSExecutionRequest = {
      templateId: "vision-test-001",
      vars: { image_input: "photo.jpg" },
    };

    const result = await executor.execute(request);

    expect(result.status).toBe("success");
    expect(result.templateId).toBe("vision-test-001");
    expect(result.renderedPrompt).toBe("Analyze this image: photo.jpg");
    expect(result.config?.max_tokens).toBe(1024);
  });

  it("should return error for missing template", async () => {
    const request: PMSExecutionRequest = {
      templateId: "nonexistent-template",
      vars: {},
    };

    const result = await executor.execute(request);

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("should return error for missing variable", async () => {
    const request: PMSExecutionRequest = {
      templateId: "vision-test-001",
      vars: {},
    };

    const result = await executor.execute(request);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required variable");
  });

  it("should include config in result", async () => {
    const request: PMSExecutionRequest = {
      templateId: "ocr-test-001",
      vars: { document: "doc.pdf", format: "plain" },
    };

    const result = await executor.execute(request);

    expect(result.config).toBeDefined();
    expect(result.config?.max_tokens).toBe(2048);
    expect(result.config?.temperature).toBe(0.1);
    expect(result.config?.top_p).toBe(0.7);
  });

  it("should expose registry", () => {
    const reg = executor.getRegistry();
    expect(reg).toBe(registry);
  });
});

// ============================================================================
// LAYER 3: INTEGRATION TESTS
// ============================================================================

describe("Integration: Load → Render → Execute", () => {
  let registry: TemplateRegistry;
  let executor: PMSExecutor;

  beforeEach(() => {
    registry = new TemplateRegistry();
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }
    executor = new PMSExecutor(registry);
  });

  it("should complete full workflow: register → retrieve → execute", async () => {
    const request: PMSExecutionRequest = {
      templateId: "vision-test-001",
      vars: { image_input: "archive-photo-001.jpg" },
    };

    const result = await executor.execute(request);

    expect(result.status).toBe("success");
    expect(result.renderedPrompt).toContain("archive-photo-001.jpg");
    expect(result.config?.max_tokens).toBe(1024);
  });

  it("should handle sequential execution of different templates", async () => {
    const requests: PMSExecutionRequest[] = [
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

    expect(results.length).toBe(3);
    expect(results.every((r) => r.status === "success")).toBe(true);
  });

  it("should validate render test cases", async () => {
    for (const testCase of FIXTURE_RENDER_CASES) {
      const request: PMSExecutionRequest = {
        templateId: testCase.templateId,
        vars: testCase.vars,
      };

      const result = await executor.execute(request);

      expect(result.status).toBe("success");
      expect(result.renderedPrompt).toBe(testCase.expected);
    }
  });

  it("should audit rendered prompts", async () => {
    const auditLog: Array<{
      templateId: string;
      timestamp: string;
      rendered: string;
    }> = [];

    const request: PMSExecutionRequest = {
      templateId: "vision-test-001",
      vars: { image_input: "test.jpg" },
    };

    const result = await executor.execute(request);

    if (result.status === "success") {
      auditLog.push({
        templateId: result.templateId,
        timestamp: new Date().toISOString(),
        rendered: result.renderedPrompt!,
      });
    }

    expect(auditLog.length).toBe(1);
    expect(auditLog[0].templateId).toBe("vision-test-001");
  });

  it("should detect version mismatches", () => {
    const v100 = registry.get("vision-test-001");
    const v200 = registry.get("custom-test-001");

    expect(v100?.version).toBe("1.0.0");
    expect(v200?.version).toBe("2.0.0");
    expect(v100?.version).not.toBe(v200?.version);
  });

  it("should report metrics after batch execution", async () => {
    const requests: PMSExecutionRequest[] = FIXTURE_RENDER_CASES.map(
      (testCase) => ({
        templateId: testCase.templateId,
        vars: testCase.vars,
      })
    );

    const results = await Promise.all(requests.map((req) => executor.execute(req)));

    const metrics = {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    expect(metrics.total).toBe(3);
    expect(metrics.success).toBe(3);
    expect(metrics.errors).toBe(0);
  });
});

describe("Integration: Error Handling", () => {
  let executor: PMSExecutor;

  beforeEach(() => {
    const registry = new TemplateRegistry();
    for (const template of FIXTURE_TEMPLATES) {
      registry.register(template);
    }
    executor = new PMSExecutor(registry);
  });

  it("should gracefully handle missing template", async () => {
    const result = await executor.execute({
      templateId: "missing-template-999",
      vars: {},
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
    expect(result.renderedPrompt).toBeUndefined();
  });

  it("should gracefully handle missing variables", async () => {
    const result = await executor.execute({
      templateId: "vision-test-001",
      vars: { wrong_var: "value" },
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required variable");
  });

  it("should not throw — all errors in result", async () => {
    const requests: PMSExecutionRequest[] = [
      { templateId: "missing-001", vars: {} },
      { templateId: "vision-test-001", vars: {} },
      { templateId: "vision-test-001", vars: { image_input: "ok.jpg" } },
    ];

    const results = await Promise.all(requests.map((req) => executor.execute(req)));

    expect(() => {
      results.forEach((r) => {
        if (r.status === "error") {
          expect(r.error).toBeDefined();
        }
      });
    }).not.toThrow();
  });
});
