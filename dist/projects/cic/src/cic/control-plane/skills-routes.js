"use strict";
// File: projects/cic/src/cic/control-plane/skills-routes.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSkillsRoutes = registerSkillsRoutes;
const skill_graph_store_js_1 = require("../../skills/skill-graph-store.js");
const skill_harvester_js_1 = require("../../skills/skill-harvester.js");
const skill_synthesizer_js_1 = require("../../skills/skill-synthesizer.js");
const skill_doctrine_sync_js_1 = require("../../skills/skill-doctrine-sync.js");
const node_path_1 = __importDefault(require("node:path"));
function registerSkillsRoutes(router) {
    const graphPath = node_path_1.default.resolve(process.cwd(), "projects/cic/skill-graph/graph.json");
    const store = new skill_graph_store_js_1.SkillGraphStore(graphPath);
    const harvester = new skill_harvester_js_1.SkillHarvester(process.cwd(), store);
    const synthesizer = new skill_synthesizer_js_1.SkillSynthesizer(store);
    // Mock mapping storage for doctrine sync
    const defaultMappings = [
        {
            cicSkillId: "skill:custom/semantic_seed.yaml",
            claudeSkillId: "claude-skill-1",
            copilotSkillId: "copilot-task-1",
            antigravityLaneId: "antigravity-lane-1"
        }
    ];
    const docSync = new skill_doctrine_sync_js_1.SkillDoctrineSync(store, defaultMappings);
    router.get("/skills/graph", (_req, res) => {
        try {
            res.json(store.load());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/skills/nodes", (_req, res) => {
        try {
            const graph = store.load();
            res.json(graph.nodes);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/skills/edges", (_req, res) => {
        try {
            const graph = store.load();
            res.json(graph.edges);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/skills/hotspots", (_req, res) => {
        try {
            const graph = store.load();
            res.json(graph.meta?.hotspots || { orphanSkills: [], unusedAgents: [], denseNodes: [] });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/skills/drift", (_req, res) => {
        try {
            res.json(docSync.computeDrift());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.post("/skills/harvest", (_req, res) => {
        try {
            harvester.run();
            synthesizer.run();
            res.json({ ok: true, graph: store.load() });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}
//# sourceMappingURL=skills-routes.js.map