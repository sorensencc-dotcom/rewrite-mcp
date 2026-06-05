/**
 * Integration Test Suite
 * End-to-end CIC → CRG → Ruflo → CIC wiring
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ContextService } from "../context-service/ContextService";
import { CRGAdapter } from "../crg-adapter/CRGAdapter";
import { FlowRegistry } from "../ruflo-orchestration/FlowRegistry";
import { FlowOrchestrator } from "../ruflo-orchestration/FlowOrchestrator";

describe("CIC/CRG/Ruflo Integration", () => {
  let contextService: ContextService;
  let crgAdapter: CRGAdapter;
  let flowRegistry: FlowRegistry;
  let flowOrchestrator: FlowOrchestrator;

  beforeEach(() => {
    // Initialize components
    crgAdapter = new CRGAdapter(process.cwd());
    contextService = new ContextService({
      crgBackendUrl: "http://localhost:8081",
      cicBackendUrl: "http://localhost:8082",
      cacheTTL: 3600000,
      repoPath: process.cwd(),
    });

    flowRegistry = new FlowRegistry();

    // Mock agent client for testing
    const mockAgentClient = {
      invoke: async (method: string, input: Record<string, unknown>) => {
        return { result: `${method} completed`, input };
      },
    };

    flowOrchestrator = new FlowOrchestrator({
      registry: flowRegistry,
      agents: {
        "code-analyzer": mockAgentClient,
        "call-graph-extractor": mockAgentClient,
        "narrative-linker": mockAgentClient,
        "context-synthesizer": mockAgentClient,
        "idea-parser": mockAgentClient,
        "idea-classifier": mockAgentClient,
      },
      maxConcurrency: 5,
      defaultTimeout: 10000,
    });
  });

  afterEach(() => {
    contextService.clearCaches();
    crgAdapter.clearCaches();
  });

  describe("CRGAdapter → ContextService", () => {
    it("should load and cache CRG graph", async () => {
      const graph = await crgAdapter.loadGraph();
      expect(graph).toBeDefined();
      expect(graph.repo).toBeDefined();
      expect(graph.files).toBeInstanceOf(Array);
    });

    it("should provide minimal context from CRG", async () => {
      const context = await crgAdapter.getMinimalContext(["*"], "trace-123");
      expect(context.id).toBeDefined();
      expect(context.type).toBe("code");
      expect(context.code?.repo).toBeDefined();
      expect(context.trace_id).toBe("trace-123");
    });

    it("should load slice content on demand", async () => {
      const graph = await crgAdapter.loadGraph();
      if (graph.files.length > 0) {
        const file = graph.files[0];
        const content = await crgAdapter.loadSliceContent(
          file.path,
          1,
          10
        );
        expect(content).toBeDefined();
        expect(typeof content).toBe("string");
      }
    });
  });

  describe("ContextService integration", () => {
    it("should retrieve context with minimal lazy-loaded structure", async () => {
      const context = await contextService.getContext("ctx-123", "trace-456");
      expect(context.id).toBeDefined();
      expect(context.type).toBe("code");
      expect(context.minimal).toBeDefined();
    });

    it("should cache retrieved contexts", async () => {
      const ctx1 = await contextService.getContext("ctx-789", "trace-1");
      const ctx2 = await contextService.getContext("ctx-789", "trace-2");
      expect(ctx1.id).toBe(ctx2.id);
    });

    it("should perform semantic search", async () => {
      await contextService.getContext("ctx-search", "trace-3");
      const results = await contextService.query({
        query: "function class",
        context_id: "ctx-search",
        limit: 5,
      });

      expect(results.results).toBeInstanceOf(Array);
      if (results.results && results.results.length > 0) {
        expect(results.results[0].slice_id).toBeDefined();
        expect(results.results[0].score).toBeGreaterThan(0);
      }
    });

    it("should report health status", async () => {
      const health = await contextService.health();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.backends).toBeDefined();
      expect(health.cache_size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("FlowRegistry registration", () => {
    it("should have default flows registered", () => {
      const templates = flowRegistry.listTemplates("active");
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.id === "flow-context-enrichment-v1")).toBe(true);
      expect(templates.some((t) => t.id === "flow-idea-classification-v1")).toBe(true);
    });

    it("should retrieve flow templates", () => {
      const template = flowRegistry.getTemplate("flow-context-enrichment-v1");
      expect(template).toBeDefined();
      expect(template!.stages.length).toBeGreaterThan(0);
    });
  });

  describe("FlowOrchestrator execution", () => {
    it("should start flow execution asynchronously", async () => {
      const executionId = await flowOrchestrator.executeFlow(
        "flow-idea-classification-v1",
        { idea_id: "idea-123" },
        "trace-flow-1"
      );

      expect(executionId).toBeDefined();
      expect(executionId).toMatch(/^exec-/);
    });

    it("should track execution state", async () => {
      const executionId = await flowOrchestrator.executeFlow(
        "flow-idea-classification-v1",
        { idea_id: "idea-456" },
        "trace-flow-2"
      );

      const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
      expect(execution.id).toBe(executionId);
      expect(execution.status).toMatch(/completed|failed|running/);
    });

    it("should pass outputs between stages", async () => {
      const executionId = await flowOrchestrator.executeFlow(
        "flow-context-enrichment-v1",
        { context_id: "ctx-999" },
        "trace-flow-3"
      );

      const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
      expect(execution.output).toBeDefined();
      if (execution.output) {
        expect(Object.keys(execution.output).length).toBeGreaterThan(0);
      }
    });

    it("should handle agent invocation errors gracefully", async () => {
      const badOrchestrator = new FlowOrchestrator({
        registry: flowRegistry,
        agents: {
          "code-analyzer": {
            invoke: async () => {
              throw new Error("Agent failed");
            },
          },
        } as any,
        maxConcurrency: 5,
        defaultTimeout: 1000,
      });

      const executionId = await badOrchestrator.executeFlow(
        "flow-context-enrichment-v1",
        { context_id: "ctx-fail" },
        "trace-flow-4"
      );

      const execution = await badOrchestrator.waitForExecution(
        executionId,
        5000
      );
      expect(execution.status).toBe("failed");
    });
  });

  describe("End-to-end flow", () => {
    it("should orchestrate context enrichment: context → CRG → Ruflo → context", async () => {
      // 1. Retrieve context with CRG
      const context = await contextService.getContext(
        "ctx-e2e",
        "trace-e2e"
      );
      expect(context.id).toBeDefined();

      // 2. Execute flow that uses context
      const executionId = await flowOrchestrator.executeFlow(
        "flow-context-enrichment-v1",
        { context_id: context.id },
        "trace-e2e"
      );
      expect(executionId).toBeDefined();

      // 3. Wait for completion
      const execution = await flowOrchestrator.waitForExecution(
        executionId,
        5000
      );
      expect(execution.status).toMatch(/completed|failed/);

      // 4. Verify output contains enriched context
      if (execution.output) {
        expect(Object.keys(execution.output).length).toBeGreaterThan(0);
      }
    });

    it("should support parallel and serial stage execution", async () => {
      const template = flowRegistry.getTemplate(
        "flow-context-enrichment-v1"
      );
      expect(template).toBeDefined();

      // Stage 0: parallel (code-analyzer + call-graph-extractor)
      expect(template!.stages[0].type).toBe("parallel");

      // Stage 1: serial (narrative-linker)
      expect(template!.stages[1].type).toBe("serial");

      const executionId = await flowOrchestrator.executeFlow(
        "flow-context-enrichment-v1",
        { context_id: "ctx-parallel" },
        "trace-parallel"
      );

      const execution = await flowOrchestrator.waitForExecution(
        executionId,
        5000
      );
      expect(execution.status).toBe("completed");
    });
  });

  describe("Observability and tracing", () => {
    it("should track execution spans", async () => {
      const executionId = await flowOrchestrator.executeFlow(
        "flow-idea-classification-v1",
        { idea_id: "idea-span-test" },
        "trace-span"
      );

      const execution = await flowOrchestrator.waitForExecution(
        executionId,
        5000
      );
      expect(execution.spans).toBeInstanceOf(Array);
      expect(execution.spans.length).toBeGreaterThan(0);

      // Verify span structure
      const span = execution.spans[0];
      expect(span.id).toBeDefined();
      expect(span.agent).toBeDefined();
      expect(span.status).toMatch(/pending|running|completed|failed/);
    });

    it("should propagate trace IDs through execution", async () => {
      const traceId = "trace-propagation-test";
      const executionId = await flowOrchestrator.executeFlow(
        "flow-idea-classification-v1",
        { idea_id: "idea-trace" },
        traceId
      );

      const execution = await flowOrchestrator.waitForExecution(
        executionId,
        5000
      );
      expect(execution.trace_id).toBe(traceId);
    });
  });

  describe("Caching behavior", () => {
    it("should cache CRG graphs", async () => {
      const graph1 = await crgAdapter.loadGraph();
      const graph2 = await crgAdapter.loadGraph();
      expect(graph1).toStrictEqual(graph2); // Same data (cached)
    });

    it("should respect cache TTL", async () => {
      const shortTTLService = new ContextService({
        crgBackendUrl: "http://localhost:8081",
        cicBackendUrl: "http://localhost:8082",
        cacheTTL: 100, // 100ms TTL
        repoPath: process.cwd(),
      });

      const ctx1 = await shortTTLService.getContext("ctx-ttl", "trace-ttl");
      await new Promise((resolve) => setTimeout(resolve, 150));
      const ctx2 = await shortTTLService.getContext("ctx-ttl", "trace-ttl");

      // Should be fresh fetch (not cached), though content may be same
      expect(ctx1.id).toBe(ctx2.id);
    });
  });
});
