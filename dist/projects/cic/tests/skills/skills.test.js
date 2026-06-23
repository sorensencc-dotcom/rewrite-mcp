"use strict";
// File: projects/cic/tests/skills/skills.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const skill_graph_store_js_1 = require("../../src/skills/skill-graph-store.js");
const skill_harvester_js_1 = require("../../src/skills/skill-harvester.js");
const skill_synthesizer_js_1 = require("../../src/skills/skill-synthesizer.js");
const skill_doctrine_sync_js_1 = require("../../src/skills/skill-doctrine-sync.js");
const skills_routes_js_1 = require("../../src/cic/control-plane/skills-routes.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("Phase 24 — Skill Graph & Cross-System Doctrine (SGD)", () => {
    const tempGraphPath = node_path_1.default.resolve(__dirname, "../../skill-graph/temp-test-graph.json");
    (0, vitest_1.beforeEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (node_fs_1.default.existsSync(tempGraphPath)) {
            node_fs_1.default.unlinkSync(tempGraphPath);
        }
    });
    (0, vitest_1.it)("SkillGraphStore loads, saves, and updates the graph", () => {
        const store = new skill_graph_store_js_1.SkillGraphStore(tempGraphPath);
        // Initial load returns empty structures
        const initial = store.load();
        (0, vitest_1.expect)(initial.nodes).toEqual([]);
        (0, vitest_1.expect)(initial.edges).toEqual([]);
        const sampleGraph = {
            nodes: [
                { id: "agent:arps", type: "agent", name: "arps-agent.ts" },
                { id: "skill:arps", type: "skill", name: "arps-rules" }
            ],
            edges: [
                { from: "agent:arps", to: "skill:arps", type: "implements" }
            ]
        };
        store.save(sampleGraph);
        const loaded = store.load();
        (0, vitest_1.expect)(loaded.nodes.length).toBe(2);
        (0, vitest_1.expect)(loaded.edges.length).toBe(1);
        // Update mutates correctly
        store.update(g => ({
            ...g,
            nodes: [...g.nodes, { id: "tool:git", type: "tool", name: "Git CLI" }]
        }));
        const updated = store.load();
        (0, vitest_1.expect)(updated.nodes.length).toBe(3);
        (0, vitest_1.expect)(updated.nodes.find(n => n.id === "tool:git")).toBeDefined();
    });
    (0, vitest_1.it)("SkillHarvester registers agents, prompts, and builds links", () => {
        const store = new skill_graph_store_js_1.SkillGraphStore(tempGraphPath);
        const repoRoot = node_path_1.default.resolve(__dirname, "../../../..");
        const harvester = new skill_harvester_js_1.SkillHarvester(repoRoot, store);
        harvester.run();
        const graph = store.load();
        (0, vitest_1.expect)(graph.nodes.length).toBeGreaterThan(0);
        // Ensure agent, skill, and external system nodes exist
        (0, vitest_1.expect)(graph.nodes.some(n => n.type === "agent")).toBe(true);
        (0, vitest_1.expect)(graph.nodes.some(n => n.type === "skill")).toBe(true);
        (0, vitest_1.expect)(graph.nodes.some(n => n.type === "external_system")).toBe(true);
    });
    (0, vitest_1.it)("SkillSynthesizer dedupes and identifies hotspots (orphans/dense nodes)", () => {
        const store = new skill_graph_store_js_1.SkillGraphStore(tempGraphPath);
        const synth = new skill_synthesizer_js_1.SkillSynthesizer(store);
        const duplicateGraph = {
            nodes: [
                { id: "agent:test", type: "agent", name: "test.ts" },
                { id: "agent:test", type: "agent", name: "test.ts" }, // Duplicate node
                { id: "skill:orphan", type: "skill", name: "orphan.yaml" },
                { id: "skill:dense", type: "skill", name: "dense.yaml" }
            ],
            edges: [
                { from: "agent:test", to: "skill:dense", type: "implements" },
                { from: "agent:test", to: "skill:dense", type: "implements" } // Duplicate edge
            ]
        };
        // Add extra edges to make a dense node (degree >= 5)
        for (let i = 0; i < 5; i++) {
            duplicateGraph.nodes.push({ id: `agent:mock-${i}`, type: "agent", name: `mock-${i}.ts` });
            duplicateGraph.edges.push({ from: `agent:mock-${i}`, to: "skill:dense", type: "implements" });
        }
        store.save(duplicateGraph);
        synth.run();
        const result = store.load();
        // Deduped nodes (test, orphan, dense + 5 mock agents = 8 nodes)
        (0, vitest_1.expect)(result.nodes.length).toBe(8);
        // Deduped edges (1 implements + 5 mock implements = 6 edges)
        (0, vitest_1.expect)(result.edges.length).toBe(6);
        const hotspots = result.meta?.hotspots;
        (0, vitest_1.expect)(hotspots).toBeDefined();
        // Orphan detection
        (0, vitest_1.expect)(hotspots.orphanSkills.length).toBe(1);
        (0, vitest_1.expect)(hotspots.orphanSkills[0].id).toBe("skill:orphan");
        // Dense node detection
        (0, vitest_1.expect)(hotspots.denseNodes.length).toBe(1);
        (0, vitest_1.expect)(hotspots.denseNodes[0].id).toBe("skill:dense");
    });
    (0, vitest_1.it)("SkillDoctrineSync detects unmapped internal skills", () => {
        const store = new skill_graph_store_js_1.SkillGraphStore(tempGraphPath);
        const sampleGraph = {
            nodes: [
                { id: "skill:mapped", type: "skill", name: "mapped.yaml" },
                { id: "skill:unmapped", type: "skill", name: "unmapped.yaml" }
            ],
            edges: []
        };
        store.save(sampleGraph);
        const sync = new skill_doctrine_sync_js_1.SkillDoctrineSync(store, [
            { cicSkillId: "skill:mapped", claudeSkillId: "c-1" }
        ]);
        const report = sync.computeDrift();
        (0, vitest_1.expect)(report.unmappedCicSkills.length).toBe(1);
        (0, vitest_1.expect)(report.unmappedCicSkills[0].id).toBe("skill:unmapped");
    });
    (0, vitest_1.it)("registerSkillsRoutes sets up router paths", () => {
        const registeredGets = new Map();
        const registeredPosts = new Map();
        const mockRouter = {
            get(path, handler) {
                registeredGets.set(path, handler);
            },
            post(path, handler) {
                registeredPosts.set(path, handler);
            }
        };
        (0, skills_routes_js_1.registerSkillsRoutes)(mockRouter);
        (0, vitest_1.expect)(registeredGets.has("/skills/graph")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/skills/nodes")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/skills/edges")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/skills/hotspots")).toBe(true);
        (0, vitest_1.expect)(registeredGets.has("/skills/drift")).toBe(true);
        (0, vitest_1.expect)(registeredPosts.has("/skills/harvest")).toBe(true);
    });
});
//# sourceMappingURL=skills.test.js.map