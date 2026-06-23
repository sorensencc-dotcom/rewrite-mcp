"use strict";
// File: projects/cic/src/cic/control-plane/ckg-routes.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCkgRoutes = registerCkgRoutes;
const ckg_store_js_1 = require("../../ckg/ckg-store.js");
const ckg_harvester_js_1 = require("../../ckg/ckg-harvester.js");
const ckg_synthesizer_js_1 = require("../../ckg/ckg-synthesizer.js");
const node_path_1 = __importDefault(require("node:path"));
function registerCkgRoutes(router) {
    const workspaceRoot = process.cwd();
    const graphPath = node_path_1.default.resolve(workspaceRoot, "projects/cic/ckg/graph.json");
    const store = new ckg_store_js_1.CkgStore(graphPath);
    const harvester = new ckg_harvester_js_1.CkgHarvester(workspaceRoot, store);
    const synthesizer = new ckg_synthesizer_js_1.CkgSynthesizer(store);
    router.get("/ckg/graph", (_req, res) => {
        try {
            res.json(store.load());
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/ckg/nodes", (req, res) => {
        try {
            const type = req.query.type;
            const tag = req.query.tag;
            let graph = store.load();
            let nodes = graph.nodes;
            if (type) {
                nodes = nodes.filter(n => n.type === type);
            }
            if (tag) {
                nodes = nodes.filter(n => n.tags?.includes(tag));
            }
            res.json(nodes);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/ckg/edges", (req, res) => {
        try {
            const type = req.query.type;
            const from = req.query.from;
            const to = req.query.to;
            let graph = store.load();
            let edges = graph.edges;
            if (type) {
                edges = edges.filter(e => e.type === type);
            }
            if (from) {
                edges = edges.filter(e => e.from === from);
            }
            if (to) {
                edges = edges.filter(e => e.to === to);
            }
            res.json(edges);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/ckg/neighborhood/:id", (req, res) => {
        try {
            const id = req.params.id;
            const depth = req.query.depth ? parseInt(req.query.depth, 10) : 2;
            res.json(store.getNeighborhood(id, depth));
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/ckg/hotspots", (_req, res) => {
        try {
            const graph = store.load();
            res.json(graph.meta?.hotspots || { centralNodes: [], orphans: [] });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.get("/ckg/drift", (_req, res) => {
        try {
            const graph = store.load();
            res.json(graph.meta?.drift || { unmappedSkills: [], stateDiscrepancies: [] });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    router.post("/ckg/harvest", (_req, res) => {
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
//# sourceMappingURL=ckg-routes.js.map