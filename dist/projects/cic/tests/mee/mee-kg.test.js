"use strict";
// File: projects/cic/tests/mee/mee-kg.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const ckg_store_js_1 = require("../../src/ckg/ckg-store.js");
const mee_kg_js_1 = require("../../src/mee/mee-kg.js");
(0, vitest_1.describe)("MeeKnowledgeGraph Subsystem", () => {
    const tempDir = node_path_1.default.resolve(process.cwd(), "projects/cic/tests/mee/temp-kg-tests");
    const graphPath = node_path_1.default.join(tempDir, "graph.json");
    let store;
    let kg;
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempDir, { recursive: true });
        store = new ckg_store_js_1.CkgStore(graphPath);
        kg = new mee_kg_js_1.MeeKnowledgeGraph(store);
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempDir)) {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("should record task nodes and dependency edges correctly", () => {
        kg.recordTaskNode("task-1", "Refactor Server", "refactor", []);
        kg.recordTaskNode("task-2", "Add Sandbox Checks", "feature", ["task-1"]);
        const graph = kg.getGraph();
        (0, vitest_1.expect)(graph.nodes.length).toBe(2);
        (0, vitest_1.expect)(graph.edges.length).toBe(1);
        (0, vitest_1.expect)(graph.edges[0]).toEqual({
            from: "task-2",
            to: "task-1",
            type: "depends_on"
        });
    });
    (0, vitest_1.it)("should record proposals, critiques, and extract fragile modules & safety risks", () => {
        // 1. Record proposal with refined file
        kg.recordProposalNode("prop-1", "Upgrade Ingest Layer", "Refining ingest parser logic", ["src/ingest.ts"]);
        // 2. Record agent critiques
        kg.recordCritiqueEdge("prop-1", {
            id: "c-1",
            agentId: "agent-safety-1",
            targetAgentId: "agent-planner",
            issue: "Found forbidden eval pattern",
            severity: "error",
            suggestedFix: "Remove eval usage",
            timestamp: new Date().toISOString()
        });
        // 3. Record sandbox failure
        kg.recordFailureNode("fail-1", "prop-1", "sandbox_compile_error", "Compilation failed in ingest.ts");
        const graph = kg.getGraph();
        (0, vitest_1.expect)(graph.nodes.some(n => n.type === "failure")).toBe(true);
        (0, vitest_1.expect)(graph.edges.some(e => e.type === "caused_failure")).toBe(true);
        (0, vitest_1.expect)(graph.edges.some(e => e.type === "critique_by")).toBe(true);
        // 4. Query semantic insights
        const fragile = kg.getFragileModules();
        (0, vitest_1.expect)(fragile.length).toBe(1);
        (0, vitest_1.expect)(fragile[0].path).toBe("src/ingest.ts");
        (0, vitest_1.expect)(fragile[0].failureCount).toBe(1);
        const risks = kg.getSafetyRisks();
        (0, vitest_1.expect)(risks.length).toBe(1);
        (0, vitest_1.expect)(risks[0]).toBe("Found forbidden eval pattern");
    });
    (0, vitest_1.it)("should record verification metrics correctly", () => {
        const metrics = {
            testCount: 15,
            passed: true,
            durationMs: 320,
            validationErrorsCount: 0
        };
        kg.recordProposalNode("prop-metrics-test", "Update Auth Scheme", "Updating auth scheme", []);
        kg.recordVerificationMetricsNode("prop-metrics-test", metrics);
        const graph = kg.getGraph();
        const metricsNode = graph.nodes.find(n => n.id === "metrics-prop-metrics-test");
        (0, vitest_1.expect)(metricsNode).toBeDefined();
        (0, vitest_1.expect)(metricsNode?.type).toBe("verification_metrics");
        (0, vitest_1.expect)(metricsNode?.meta?.testCount).toBe(15);
        (0, vitest_1.expect)(metricsNode?.meta?.passed).toBe(true);
        const metricsEdge = graph.edges.find(e => e.from === "prop-metrics-test" && e.to === "metrics-prop-metrics-test");
        (0, vitest_1.expect)(metricsEdge).toBeDefined();
        (0, vitest_1.expect)(metricsEdge?.type).toBe("has_metrics");
    });
});
//# sourceMappingURL=mee-kg.test.js.map