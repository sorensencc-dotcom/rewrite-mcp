"use strict";
// File: projects/cic/src/ckg/ckg-synthesizer.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.CkgSynthesizer = void 0;
class CkgSynthesizer {
    constructor(store) {
        this.store = store;
    }
    run() {
        const graph = this.store.load();
        // 1. Deduplicate nodes & edges
        const uniqueNodesMap = new Map();
        for (const node of graph.nodes) {
            uniqueNodesMap.set(node.id, node);
        }
        const dedupedNodes = Array.from(uniqueNodesMap.values());
        const uniqueEdgesMap = new Map();
        for (const edge of graph.edges) {
            const key = `${edge.from}->${edge.to}:${edge.type}`;
            uniqueEdgesMap.set(key, edge);
        }
        const dedupedEdges = Array.from(uniqueEdgesMap.values());
        // 2. Compute Node Degrees
        const degrees = new Map();
        for (const edge of dedupedEdges) {
            degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
            degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
        }
        // 3. Hotspots - Central Nodes & Orphans
        const centralNodes = [];
        const orphans = [];
        for (const node of dedupedNodes) {
            const deg = degrees.get(node.id) || 0;
            if (deg >= 5) {
                centralNodes.push(node);
            }
            else if (deg === 0) {
                orphans.push(node);
            }
        }
        // 4. Heuristic Drift Detection (e.g. unmapped skills or discrepancies)
        const unmappedSkills = [];
        const stateDiscrepancies = [];
        // Find skills that are not target of any 'implements' or 'depends_on' edges
        const skills = dedupedNodes.filter(n => n.type === "skill");
        for (const skill of skills) {
            const isTarget = dedupedEdges.some(e => e.to === skill.id && (e.type === "implements" || e.type === "depends_on"));
            if (!isTarget) {
                unmappedSkills.push({
                    id: skill.id,
                    name: skill.name,
                    issue: "Orphan Skill: No active agent implements or depends on this capability node."
                });
            }
        }
        // Find state discrepancies: e.g. execution tasks marked as 'failed' linked to complete status
        const failedTasks = dedupedNodes.filter(n => n.type === "task" && n.tags?.includes("failed"));
        for (const ft of failedTasks) {
            stateDiscrepancies.push({
                nodeId: ft.id,
                name: ft.name,
                issue: `Discrepancy: Execution task is failed but marked complete in general documentation state.`
            });
        }
        // Save back metadata
        const updatedGraph = {
            nodes: dedupedNodes,
            edges: dedupedEdges,
            meta: {
                ...graph.meta,
                hotspots: {
                    centralNodes,
                    orphans
                },
                drift: {
                    unmappedSkills,
                    stateDiscrepancies
                }
            }
        };
        this.store.save(updatedGraph);
    }
}
exports.CkgSynthesizer = CkgSynthesizer;
//# sourceMappingURL=ckg-synthesizer.js.map