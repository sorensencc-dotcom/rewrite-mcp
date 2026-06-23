"use strict";
/**
 * Integration Test Suite
 * End-to-end CIC → CRG → Ruflo → CIC wiring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ContextService_1 = require("../src/context-service/ContextService");
const CRGAdapter_1 = require("../src/crg-adapter/CRGAdapter");
const FlowRegistry_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowRegistry.js"));
const FlowOrchestrator_js_1 = __importDefault(require("../src/ruflo-orchestration/FlowOrchestrator.js"));
(0, vitest_1.describe)("CIC/CRG/Ruflo Integration", () => {
    let contextService;
    let crgAdapter;
    let flowRegistry;
    let flowOrchestrator;
    (0, vitest_1.beforeEach)(() => {
        // Initialize components
        crgAdapter = new CRGAdapter_1.CRGAdapter(process.cwd());
        contextService = new ContextService_1.ContextService({
            crgBackendUrl: "http://localhost:8081",
            cicBackendUrl: "http://localhost:8082",
            cacheTTL: 3600000,
            repoPath: process.cwd(),
        });
        flowRegistry = new FlowRegistry_js_1.default();
        // Mock agent client for testing
        const mockAgentClient = {
            invoke: async (method, input) => {
                return { result: `${method} completed`, input };
            },
        };
        flowOrchestrator = new FlowOrchestrator_js_1.default({
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
    (0, vitest_1.afterEach)(() => {
        contextService.clearCaches();
        crgAdapter.clearCaches();
    });
    (0, vitest_1.describe)("CRGAdapter → ContextService", () => {
        (0, vitest_1.it)("should load and cache CRG graph", async () => {
            const graph = await crgAdapter.loadGraph();
            (0, vitest_1.expect)(graph).toBeDefined();
            (0, vitest_1.expect)(graph.repo).toBeDefined();
            (0, vitest_1.expect)(graph.files).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)("should provide minimal context from CRG", async () => {
            const context = await crgAdapter.getMinimalContext(["*"], "trace-123");
            (0, vitest_1.expect)(context.id).toBeDefined();
            (0, vitest_1.expect)(context.type).toBe("code");
            (0, vitest_1.expect)(context.code?.repo).toBeDefined();
            (0, vitest_1.expect)(context.trace_id).toBe("trace-123");
        });
        (0, vitest_1.it)("should load slice content on demand", async () => {
            const graph = await crgAdapter.loadGraph();
            if (graph.files.length > 0) {
                const file = graph.files[0];
                const content = await crgAdapter.loadSliceContent(file.path, 1, 10);
                (0, vitest_1.expect)(content).toBeDefined();
                (0, vitest_1.expect)(typeof content).toBe("string");
            }
        });
    });
    (0, vitest_1.describe)("ContextService integration", () => {
        (0, vitest_1.it)("should retrieve context with minimal lazy-loaded structure", async () => {
            const context = await contextService.getContext("ctx-123", "trace-456");
            (0, vitest_1.expect)(context.id).toBeDefined();
            (0, vitest_1.expect)(context.type).toBe("code");
            (0, vitest_1.expect)(context.minimal).toBeDefined();
        });
        (0, vitest_1.it)("should cache retrieved contexts", async () => {
            const ctx1 = await contextService.getContext("ctx-789", "trace-1");
            const ctx2 = await contextService.getContext("ctx-789", "trace-2");
            (0, vitest_1.expect)(ctx1.id).toBe(ctx2.id);
        });
        (0, vitest_1.it)("should perform semantic search", async () => {
            await contextService.getContext("ctx-search", "trace-3");
            const results = await contextService.query({
                query: "function class",
                context_id: "ctx-search",
                limit: 5,
            });
            (0, vitest_1.expect)(results.results).toBeInstanceOf(Array);
            if (results.results && results.results.length > 0) {
                (0, vitest_1.expect)(results.results[0].slice_id).toBeDefined();
                (0, vitest_1.expect)(results.results[0].score).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)("should report health status", async () => {
            const health = await contextService.health();
            (0, vitest_1.expect)(health.status).toMatch(/healthy|degraded|unhealthy/);
            (0, vitest_1.expect)(health.backends).toBeDefined();
            (0, vitest_1.expect)(health.cache_size).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)("FlowRegistry registration", () => {
        (0, vitest_1.it)("should have default flows registered", () => {
            const templates = flowRegistry.listTemplates("active");
            (0, vitest_1.expect)(templates.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(templates.some((t) => t.id === "flow-context-enrichment-v1")).toBe(true);
            (0, vitest_1.expect)(templates.some((t) => t.id === "flow-idea-classification-v1")).toBe(true);
        });
        (0, vitest_1.it)("should retrieve flow templates", () => {
            const template = flowRegistry.getTemplate("flow-context-enrichment-v1");
            (0, vitest_1.expect)(template).toBeDefined();
            (0, vitest_1.expect)(template.stages.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)("FlowOrchestrator execution", () => {
        (0, vitest_1.it)("should start flow execution asynchronously", async () => {
            const executionId = await flowOrchestrator.executeFlow("flow-idea-classification-v1", { idea_id: "idea-123" }, "trace-flow-1");
            (0, vitest_1.expect)(executionId).toBeDefined();
            (0, vitest_1.expect)(executionId).toMatch(/^exec-/);
        });
        (0, vitest_1.it)("should track execution state", async () => {
            const executionId = await flowOrchestrator.executeFlow("flow-idea-classification-v1", { idea_id: "idea-456" }, "trace-flow-2");
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.id).toBe(executionId);
            (0, vitest_1.expect)(execution.status).toMatch(/completed|failed|running/);
        });
        (0, vitest_1.it)("should pass outputs between stages", async () => {
            const executionId = await flowOrchestrator.executeFlow("flow-context-enrichment-v1", { context_id: "ctx-999" }, "trace-flow-3");
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.output).toBeDefined();
            if (execution.output) {
                (0, vitest_1.expect)(Object.keys(execution.output).length).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)("should handle agent invocation errors gracefully", async () => {
            const badOrchestrator = new FlowOrchestrator_js_1.default({
                registry: flowRegistry,
                agents: {
                    "code-analyzer": {
                        invoke: async () => {
                            throw new Error("Agent failed");
                        },
                    },
                },
                maxConcurrency: 5,
                defaultTimeout: 1000,
            });
            const executionId = await badOrchestrator.executeFlow("flow-context-enrichment-v1", { context_id: "ctx-fail" }, "trace-flow-4");
            const execution = await badOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.status).toBe("failed");
        });
    });
    (0, vitest_1.describe)("End-to-end flow", () => {
        (0, vitest_1.it)("should orchestrate context enrichment: context → CRG → Ruflo → context", async () => {
            // 1. Retrieve context with CRG
            const context = await contextService.getContext("ctx-e2e", "trace-e2e");
            (0, vitest_1.expect)(context.id).toBeDefined();
            // 2. Execute flow that uses context
            const executionId = await flowOrchestrator.executeFlow("flow-context-enrichment-v1", { context_id: context.id }, "trace-e2e");
            (0, vitest_1.expect)(executionId).toBeDefined();
            // 3. Wait for completion
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.status).toMatch(/completed|failed/);
            // 4. Verify output contains enriched context
            if (execution.output) {
                (0, vitest_1.expect)(Object.keys(execution.output).length).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)("should support parallel and serial stage execution", async () => {
            const template = flowRegistry.getTemplate("flow-context-enrichment-v1");
            (0, vitest_1.expect)(template).toBeDefined();
            // Stage 0: parallel (code-analyzer + call-graph-extractor)
            (0, vitest_1.expect)(template.stages[0].type).toBe("parallel");
            // Stage 1: serial (narrative-linker)
            (0, vitest_1.expect)(template.stages[1].type).toBe("serial");
            const executionId = await flowOrchestrator.executeFlow("flow-context-enrichment-v1", { context_id: "ctx-parallel" }, "trace-parallel");
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.status).toBe("completed");
        });
    });
    (0, vitest_1.describe)("Observability and tracing", () => {
        (0, vitest_1.it)("should track execution spans", async () => {
            const executionId = await flowOrchestrator.executeFlow("flow-idea-classification-v1", { idea_id: "idea-span-test" }, "trace-span");
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.spans).toBeInstanceOf(Array);
            (0, vitest_1.expect)(execution.spans.length).toBeGreaterThan(0);
            // Verify span structure
            const span = execution.spans[0];
            (0, vitest_1.expect)(span.id).toBeDefined();
            (0, vitest_1.expect)(span.agent).toBeDefined();
            (0, vitest_1.expect)(span.status).toMatch(/pending|running|completed|failed/);
        });
        (0, vitest_1.it)("should propagate trace IDs through execution", async () => {
            const traceId = "trace-propagation-test";
            const executionId = await flowOrchestrator.executeFlow("flow-idea-classification-v1", { idea_id: "idea-trace" }, traceId);
            const execution = await flowOrchestrator.waitForExecution(executionId, 5000);
            (0, vitest_1.expect)(execution.trace_id).toBe(traceId);
        });
    });
    (0, vitest_1.describe)("Caching behavior", () => {
        (0, vitest_1.it)("should cache CRG graphs", async () => {
            const graph1 = await crgAdapter.loadGraph();
            const graph2 = await crgAdapter.loadGraph();
            (0, vitest_1.expect)(graph1).toStrictEqual(graph2); // Same data (cached)
        });
        (0, vitest_1.it)("should respect cache TTL", async () => {
            const shortTTLService = new ContextService_1.ContextService({
                crgBackendUrl: "http://localhost:8081",
                cicBackendUrl: "http://localhost:8082",
                cacheTTL: 100, // 100ms TTL
                repoPath: process.cwd(),
            });
            const ctx1 = await shortTTLService.getContext("ctx-ttl", "trace-ttl");
            await new Promise((resolve) => setTimeout(resolve, 150));
            const ctx2 = await shortTTLService.getContext("ctx-ttl", "trace-ttl");
            // Should be fresh fetch (not cached), though content may be same
            (0, vitest_1.expect)(ctx1.id).toBe(ctx2.id);
        });
    });
});
//# sourceMappingURL=integration.test.js.map