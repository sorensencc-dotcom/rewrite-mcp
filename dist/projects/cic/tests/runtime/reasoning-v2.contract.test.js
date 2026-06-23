"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const retrieval_planner_js_1 = require("../../src/reasoning/retrieval-planner.js");
const evidence_collector_js_1 = require("../../src/reasoning/evidence-collector.js");
const reasoning_orchestrator_js_1 = require("../../src/reasoning/reasoning-orchestrator.js");
const reason_trace_js_1 = require("../../src/reasoning/reason-trace.js");
const entity_resolver_js_1 = require("../../src/linking/entity-resolver.js");
const graph_builder_js_1 = require("../../src/linking/graph-builder.js");
const vector_index_js_1 = require("../../src/indexer/vector-index.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const testTracesDir = path_1.default.resolve(__dirname, "../../data/test_traces");
(0, vitest_1.describe)("Reasoning Layer Contract Tests (v1.3.2)", () => {
    let planner;
    let collector;
    let orchestrator;
    let vectorIndex;
    (0, vitest_1.beforeEach)(() => {
        planner = new retrieval_planner_js_1.RetrievalPlanner();
        collector = new evidence_collector_js_1.EvidenceCollector();
        orchestrator = new reasoning_orchestrator_js_1.ReasoningOrchestrator();
        vectorIndex = new vector_index_js_1.VectorIndex();
        // Clear singleton states to guarantee clean isolated tests
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
    (0, vitest_1.describe)("RetrievalPlanner", () => {
        (0, vitest_1.it)(" Scenario 1: parses semantic queries, triggers graph traversals, and bounds evidence budgets", () => {
            // Seed registry to match recognized entity
            entity_resolver_js_1.entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Ford Motor Company" });
            const query = "Analyze the birthplace of Charles Emil Sorensen and historical context.";
            const plan = planner.plan(query, { maxDocuments: 4, maxTokens: 2048 });
            (0, vitest_1.expect)(plan.query).toBe(query);
            (0, vitest_1.expect)(plan.evidenceBudget.maxDocuments).toBe(4);
            (0, vitest_1.expect)(plan.evidenceBudget.maxTokens).toBe(2048);
            // Should identify "Charles Emil Sorensen" in query and append graph queries
            (0, vitest_1.expect)(plan.graphQueries).toHaveLength(1);
            (0, vitest_1.expect)(plan.graphQueries[0].depth).toBe(2);
            // Should append targeted vector queries for the identified entity
            const targetedVQ = plan.vectorQueries.find(q => q.query === "Charles Emil Sorensen");
            (0, vitest_1.expect)(targetedVQ).toBeDefined();
        });
    });
    (0, vitest_1.describe)("ContradictionGuard & Orchestrator", () => {
        (0, vitest_1.it)("Scenario 2: detects conflicting claims, tags low confidence, and serializes replayable traces", async () => {
            // Seed resolver and graph builder with polar claims
            const ent = entity_resolver_js_1.entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Born in Detroit", docId: "doc-D" });
            const docD = {
                docId: "doc-D",
                rawText: "Charles Sorensen was born in Detroit, Michigan.",
                entities: [ent],
                relationships: [],
                topics: [],
                summary: "Doc D",
                timestamp: new Date().toISOString()
            };
            graph_builder_js_1.graphBuilder.addDocumentGraph(docD, []);
            await vectorIndex.upsert(docD);
            // Resolve conflicting alias
            const entConf = entity_resolver_js_1.entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Born in Denmark", docId: "doc-E" });
            const docE = {
                docId: "doc-E",
                rawText: "Charles Sorensen was born in Denmark, Lellinge parish.",
                entities: [entConf],
                relationships: [],
                topics: [],
                summary: "Doc E",
                timestamp: new Date().toISOString()
            };
            graph_builder_js_1.graphBuilder.addDocumentGraph(docE, []);
            await vectorIndex.upsert(docE);
            // Execute reasoning query
            const trace = await orchestrator.reason("Retrieve birthplace origins for Charles Sorensen");
            (0, vitest_1.expect)(trace.traceId).toBeDefined();
            (0, vitest_1.expect)(trace.isContested).toBe(true);
            (0, vitest_1.expect)(trace.confidence).toBe("low");
            (0, vitest_1.expect)(trace.contradictionsDetected).toHaveLength(1);
            (0, vitest_1.expect)(trace.contradictionsDetected[0].severity).toBe("high");
            (0, vitest_1.expect)(trace.finalAnswer).toContain("WARNING: Contradictory evidence detected");
            // Verify serialization
            const traceFilePath = reason_trace_js_1.reasonTraceManager.save(trace, testTracesDir);
            (0, vitest_1.expect)(fs_1.default.existsSync(traceFilePath)).toBe(true);
            // Load trace and verify RAG parameters
            const loaded = reason_trace_js_1.reasonTraceManager.load(trace.traceId, testTracesDir);
            (0, vitest_1.expect)(loaded).not.toBeNull();
            (0, vitest_1.expect)(loaded.query).toBe(trace.query);
            (0, vitest_1.expect)(loaded.finalAnswer).toBe(trace.finalAnswer);
            (0, vitest_1.expect)(loaded.stageLatenciesMs.planning).toBeDefined();
            (0, vitest_1.expect)(loaded.stageLatenciesMs.collection).toBeDefined();
        });
    });
});
//# sourceMappingURL=reasoning-v2.contract.test.js.map