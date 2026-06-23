"use strict";
// File: projects/cic/tests/ckg/ckg.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const ckg_store_js_1 = require("../../src/ckg/ckg-store.js");
const ckg_harvester_js_1 = require("../../src/ckg/ckg-harvester.js");
const ckg_synthesizer_js_1 = require("../../src/ckg/ckg-synthesizer.js");
const ckg_routes_js_1 = require("../../src/cic/control-plane/ckg-routes.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 27 — CKG Knowledge Graph", () => {
    const tempGraphPath = node_path_1.default.resolve(__dirname, "../../ckg/temp-test-graph.json");
    const tempWorkspaceRoot = node_path_1.default.resolve(__dirname, "../../temp-test-workspace");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
        if (node_fs_1.default.existsSync(tempWorkspaceRoot)) {
            node_fs_1.default.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
        }
        node_fs_1.default.mkdirSync(tempWorkspaceRoot, { recursive: true });
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
        if (node_fs_1.default.existsSync(tempWorkspaceRoot)) {
            node_fs_1.default.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("loads, saves, appends nodes and edges in CkgStore", () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        // Initial load should be empty
        const emptyGraph = store.load();
        (0, vitest_1.expect)(emptyGraph.nodes).toEqual([]);
        (0, vitest_1.expect)(emptyGraph.edges).toEqual([]);
        // Append Node
        store.appendNode({
            id: "test:n1",
            type: "skill",
            name: "Test Skill 1",
            tags: ["tag1"]
        });
        let graph = store.load();
        (0, vitest_1.expect)(graph.nodes.length).toBe(1);
        (0, vitest_1.expect)(graph.nodes[0].id).toBe("test:n1");
        // Append duplicate/update Node
        store.appendNode({
            id: "test:n1",
            type: "skill",
            name: "Test Skill 1 Updated",
            tags: ["tag2"]
        });
        graph = store.load();
        (0, vitest_1.expect)(graph.nodes.length).toBe(1);
        (0, vitest_1.expect)(graph.nodes[0].name).toBe("Test Skill 1 Updated");
        (0, vitest_1.expect)(graph.nodes[0].tags).toContain("tag1");
        (0, vitest_1.expect)(graph.nodes[0].tags).toContain("tag2");
        // Append Edge
        store.appendEdge({
            from: "test:n1",
            to: "test:n2",
            type: "depends_on"
        });
        graph = store.load();
        (0, vitest_1.expect)(graph.edges.length).toBe(1);
        (0, vitest_1.expect)(graph.edges[0].from).toBe("test:n1");
        (0, vitest_1.expect)(graph.edges[0].to).toBe("test:n2");
    });
    (0, vitest_1.it)("calculates neighborhood correctly", () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        store.appendNode({ id: "n1", type: "skill", name: "N1" });
        store.appendNode({ id: "n2", type: "skill", name: "N2" });
        store.appendNode({ id: "n3", type: "skill", name: "N3" });
        store.appendNode({ id: "n4", type: "skill", name: "N4" });
        store.appendEdge({ from: "n1", to: "n2", type: "rel" });
        store.appendEdge({ from: "n2", to: "n3", type: "rel" });
        // Out of depth bound (depth 3)
        store.appendEdge({ from: "n3", to: "n4", type: "rel" });
        const neighborhood = store.getNeighborhood("n1", 2);
        (0, vitest_1.expect)(neighborhood.nodes.some(n => n.id === "n1")).toBe(true);
        (0, vitest_1.expect)(neighborhood.nodes.some(n => n.id === "n2")).toBe(true);
        (0, vitest_1.expect)(neighborhood.nodes.some(n => n.id === "n3")).toBe(true);
        (0, vitest_1.expect)(neighborhood.nodes.some(n => n.id === "n4")).toBe(false); // depth 3
        (0, vitest_1.expect)(neighborhood.edges.length).toBe(2);
    });
    (0, vitest_1.it)("harvester correctly extracts files across systems", () => {
        // Setup mock workspace files
        const docsDir = node_path_1.default.resolve(tempWorkspaceRoot, "docs/cic");
        node_fs_1.default.mkdirSync(docsDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(docsDir, "CIC_TEST_DOC.md"), "# Test Doc");
        const memoryDir = node_path_1.default.resolve(tempWorkspaceRoot, "projects/cic/data");
        node_fs_1.default.mkdirSync(memoryDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(memoryDir, "memory-ledger.jsonl"), JSON.stringify({ id: "evt1", type: "pipeline.run", timestamp: new Date().toISOString(), payload: {} }) + "\n");
        const skillDir = node_path_1.default.resolve(tempWorkspaceRoot, "projects/cic/skill-graph");
        node_fs_1.default.mkdirSync(skillDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(skillDir, "graph.json"), JSON.stringify({
            nodes: [{ id: "skill:test", type: "skill", name: "Test Skill" }],
            edges: [{ from: "agent:charlie", to: "skill:test", type: "implements" }]
        }));
        const aprDir = node_path_1.default.resolve(tempWorkspaceRoot, "projects/cic/.apr");
        node_fs_1.default.mkdirSync(aprDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(aprDir, "episodes.jsonl"), JSON.stringify({
            id: "ep1",
            status: "complete",
            timestamp: new Date().toISOString(),
            decision: {
                plan: {
                    goals: [{ id: "g1", title: "Goal 1", priority: "high", description: "First Goal" }]
                }
            }
        }) + "\n");
        const croDir = node_path_1.default.resolve(tempWorkspaceRoot, "projects/cic/.cro");
        node_fs_1.default.mkdirSync(croDir, { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(croDir, "executions.jsonl"), JSON.stringify({
            id: "ex1",
            status: "success",
            timestamp: new Date().toISOString(),
            tasks: [{ taskId: "t1", title: "Task 1", status: "complete", owner: "agent:charlie", retryCount: 0 }]
        }) + "\n");
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        const harvester = new ckg_harvester_js_1.CkgHarvester(tempWorkspaceRoot, store);
        harvester.run();
        const graph = store.load();
        // Validate doc node
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "doc:cic_test_doc.md")).toBe(true);
        // Validate memory node
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "memory:evt1")).toBe(true);
        // Validate skill node and edge
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "skill:test")).toBe(true);
        (0, vitest_1.expect)(graph.edges.some(e => e.from === "agent:charlie" && e.to === "skill:test")).toBe(true);
        // Validate APR node
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "apr:ep1")).toBe(true);
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "goal:g1")).toBe(true);
        // Validate CRO node
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "cro:ex1")).toBe(true);
        (0, vitest_1.expect)(graph.nodes.some(n => n.id === "execution_task:t1")).toBe(true);
    });
    (0, vitest_1.it)("synthesizer deduplicates nodes/edges and identifies hotspots & drift", () => {
        const store = new ckg_store_js_1.CkgStore(tempGraphPath);
        // Nodes
        store.appendNode({ id: "hub", type: "concept", name: "Central Hub" });
        for (let i = 1; i <= 6; i++) {
            store.appendNode({ id: `leaf:${i}`, type: "concept", name: `Leaf ${i}` });
            store.appendEdge({ from: "hub", to: `leaf:${i}`, type: "connects" });
        }
        // Orphan skill node
        store.appendNode({ id: "skill:orphan", type: "skill", name: "Orphan Skill" });
        // Normal skill node with dependency (should not be unmapped)
        store.appendNode({ id: "skill:mapped", type: "skill", name: "Mapped Skill" });
        store.appendEdge({ from: "agent:charlie", to: "skill:mapped", type: "implements" });
        // Failed task discrepancy
        store.appendNode({ id: "task:failed", type: "task", name: "Failed Task", tags: ["failed"] });
        const synthesizer = new ckg_synthesizer_js_1.CkgSynthesizer(store);
        synthesizer.run();
        const graph = store.load();
        (0, vitest_1.expect)(graph.meta?.hotspots?.centralNodes.some(n => n.id === "hub")).toBe(true);
        (0, vitest_1.expect)(graph.meta?.hotspots?.orphans.some(n => n.id === "skill:orphan")).toBe(true);
        // Check drift report
        (0, vitest_1.expect)(graph.meta?.drift?.unmappedSkills.some(us => us.id === "skill:orphan")).toBe(true);
        (0, vitest_1.expect)(graph.meta?.drift?.unmappedSkills.some(us => us.id === "skill:mapped")).toBe(false);
        (0, vitest_1.expect)(graph.meta?.drift?.stateDiscrepancies.some(sd => sd.nodeId === "task:failed")).toBe(true);
    });
    (0, vitest_1.it)("registers Express REST routes", () => {
        const mockRouter = {
            get: [],
            post: [],
        };
        const routerProxy = {
            get(path, handler) {
                mockRouter.get.push({ path, handler });
            },
            post(path, handler) {
                mockRouter.post.push({ path, handler });
            }
        };
        (0, ckg_routes_js_1.registerCkgRoutes)(routerProxy);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/graph")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/nodes")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/edges")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/neighborhood/:id")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/hotspots")).toBe(true);
        (0, vitest_1.expect)(mockRouter.get.some(r => r.path === "/ckg/drift")).toBe(true);
        (0, vitest_1.expect)(mockRouter.post.some(r => r.path === "/ckg/harvest")).toBe(true);
    });
});
//# sourceMappingURL=ckg.test.js.map