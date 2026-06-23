"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const harvester_js_1 = require("../../src/harvester/harvester.js");
const vector_index_js_1 = require("../../src/indexer/vector-index.js");
const entity_resolver_js_1 = require("../../src/linking/entity-resolver.js");
const graph_builder_js_1 = require("../../src/linking/graph-builder.js");
const reasoning_orchestrator_js_1 = require("../../src/reasoning/reasoning-orchestrator.js");
const reason_trace_js_1 = require("../../src/reasoning/reason-trace.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const testTracesDir = path_1.default.resolve(__dirname, "../../data/test_traces_hybrid");
(0, vitest_1.describe)("Reasoning Layer Hybrid Integration Tests (Mode B)", () => {
    let harvester;
    let vectorIndex;
    (0, vitest_1.beforeEach)(() => {
        harvester = new harvester_js_1.Harvester();
        vectorIndex = new vector_index_js_1.VectorIndex();
        // Clear runtime states
        entity_resolver_js_1.entityResolver.clear();
        graph_builder_js_1.graphBuilder.clear();
        if (!fs_1.default.existsSync(testTracesDir)) {
            fs_1.default.mkdirSync(testTracesDir, { recursive: true });
        }
    });
    (0, vitest_1.afterAll)(() => {
        try {
            if (fs_1.default.existsSync(testTracesDir)) {
                const files = fs_1.default.readdirSync(testTracesDir);
                for (const file of files) {
                    fs_1.default.unlinkSync(path_1.default.join(testTracesDir, file));
                }
                fs_1.default.rmdirSync(testTracesDir);
            }
        }
        catch {
            // Ignored
        }
    });
    (0, vitest_1.it)("Scenario 3: ingest batches, query end-to-end multi-hop RAG, and verify trace replayability", async () => {
        // 1. Ingest Doc 1: Biography of Charles Sorensen born in Denmark
        await harvester.run({
            type: "semantic",
            payload: {
                docId: "doc-bio-1",
                raw: "Charles Sorensen was born in Denmark, Lellinge parish. He was a pioneer in mass production."
            }
        });
        // 2. Ingest Doc 2: Relational association with Ford
        await harvester.run({
            type: "semantic",
            payload: {
                docId: "doc-bio-2",
                raw: "Charles Sorensen emigrated to America and worked at Ford Motor Company."
            }
        });
        // Assert graph builder loaded both documents and resolved entity
        const summary = graph_builder_js_1.graphBuilder.getSummary();
        (0, vitest_1.expect)(summary.nodes.documents).toBe(2);
        (0, vitest_1.expect)(summary.nodes.entities).toBeGreaterThanOrEqual(1);
        // 3. Execute End-to-End reasoning RAG query
        const trace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason("Analyze emigration and company worked at for Charles Sorensen");
        (0, vitest_1.expect)(trace.traceId).toBeDefined();
        (0, vitest_1.expect)(trace.query).toContain("emigration");
        (0, vitest_1.expect)(trace.evidenceEvaluated).toHaveLength(2); // Should pull both valid biography documents
        (0, vitest_1.expect)(trace.finalAnswer).toContain("Ford Motor Company");
        // 4. Save trace to temporary trace dir
        const traceFilePath = reason_trace_js_1.reasonTraceManager.save(trace, testTracesDir);
        (0, vitest_1.expect)(fs_1.default.existsSync(traceFilePath)).toBe(true);
        // 5. Simulate Trace Replay
        const loadedTrace = reason_trace_js_1.reasonTraceManager.load(trace.traceId, testTracesDir);
        (0, vitest_1.expect)(loadedTrace).not.toBeNull();
        // Replay with new budget constraints (maxDocuments: 1)
        const replayedTrace = await reasoning_orchestrator_js_1.reasoningOrchestrator.reason(loadedTrace.query, {
            timeWindow: loadedTrace.plan.temporalSlice,
            maxDocuments: 1,
            maxTokens: loadedTrace.plan.evidenceBudget.maxTokens
        });
        (0, vitest_1.expect)(replayedTrace.query).toBe(loadedTrace.query);
        (0, vitest_1.expect)(replayedTrace.plan.evidenceBudget.maxDocuments).toBe(1);
        (0, vitest_1.expect)(replayedTrace.evidenceEvaluated).toHaveLength(1); // Budget capped at 1 document!
        (0, vitest_1.expect)(replayedTrace.traceId).not.toBe(loadedTrace.traceId); // New trace ID compiled
    });
});
//# sourceMappingURL=reasoning-v2.hybrid.test.js.map