"use strict";
// File: projects/cic/src/ckg/ckg-store.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CkgStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class CkgStore {
    constructor(graphPath) {
        this.graphPath = graphPath;
    }
    load() {
        if (!node_fs_1.default.existsSync(this.graphPath)) {
            return { nodes: [], edges: [] };
        }
        try {
            const raw = node_fs_1.default.readFileSync(this.graphPath, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return { nodes: [], edges: [] };
        }
    }
    save(graph) {
        const dir = node_path_1.default.dirname(this.graphPath);
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
        graph.meta = {
            ...graph.meta,
            lastUpdated: new Date().toISOString()
        };
        node_fs_1.default.writeFileSync(this.graphPath, JSON.stringify(graph, null, 2), "utf8");
    }
    appendNode(node) {
        const graph = this.load();
        const existingIdx = graph.nodes.findIndex(n => n.id === node.id);
        if (existingIdx !== -1) {
            graph.nodes[existingIdx] = {
                ...graph.nodes[existingIdx],
                ...node,
                tags: Array.from(new Set([...(graph.nodes[existingIdx].tags || []), ...(node.tags || [])]))
            };
        }
        else {
            graph.nodes.push(node);
        }
        this.save(graph);
    }
    appendEdge(edge) {
        const graph = this.load();
        const edgeExists = graph.edges.some(e => e.from === edge.from && e.to === edge.to && e.type === edge.type);
        if (!edgeExists) {
            graph.edges.push(edge);
        }
        this.save(graph);
    }
    getNeighborhood(nodeId, maxDepth = 2) {
        const graph = this.load();
        const visited = new Set([nodeId]);
        const resultNodes = [];
        const resultEdges = [];
        const queue = [{ id: nodeId, depth: 0 }];
        const startNode = graph.nodes.find(n => n.id === nodeId);
        if (startNode) {
            resultNodes.push(startNode);
        }
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.depth >= maxDepth)
                continue;
            // Find edges connected to the current node
            const connectedEdges = graph.edges.filter(e => e.from === current.id || e.to === current.id);
            for (const edge of connectedEdges) {
                const neighborId = edge.from === current.id ? edge.to : edge.from;
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const neighborNode = graph.nodes.find(n => n.id === neighborId);
                    if (neighborNode) {
                        resultNodes.push(neighborNode);
                        queue.push({ id: neighborId, depth: current.depth + 1 });
                    }
                }
                // Keep the edge in our neighborhood output
                if (!resultEdges.some(re => re.from === edge.from && re.to === edge.to && re.type === edge.type)) {
                    resultEdges.push(edge);
                }
            }
        }
        return { nodes: resultNodes, edges: resultEdges };
    }
}
exports.CkgStore = CkgStore;
//# sourceMappingURL=ckg-store.js.map