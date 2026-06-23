// File: projects/cic/src/skills/skill-synthesizer.ts | Date: 2026-06-03 | v1.0.0
export class SkillSynthesizer {
    constructor(store) {
        this.store = store;
    }
    dedupe(graph) {
        const seenNodes = new Map();
        for (const n of graph.nodes)
            seenNodes.set(n.id, n);
        const seenEdges = new Map();
        for (const e of graph.edges) {
            const key = `${e.from}->${e.to}:${e.type}`;
            seenEdges.set(key, e);
        }
        return {
            nodes: [...seenNodes.values()],
            edges: [...seenEdges.values()]
        };
    }
    computeHotspots(graph) {
        const incoming = new Map();
        const outgoing = new Map();
        for (const e of graph.edges) {
            outgoing.set(e.from, (outgoing.get(e.from) || 0) + 1);
            incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
        }
        const orphanSkills = graph.nodes.filter(n => n.type === "skill" &&
            !incoming.get(n.id) &&
            !outgoing.get(n.id));
        const unusedAgents = graph.nodes.filter(n => n.type === "agent" &&
            !outgoing.get(n.id));
        const denseNodes = graph.nodes.filter(n => (incoming.get(n.id) || 0) + (outgoing.get(n.id) || 0) >= 5);
        return { orphanSkills, unusedAgents, denseNodes };
    }
    run() {
        this.store.update(g => {
            const deduped = this.dedupe(g);
            const hotspots = this.computeHotspots(deduped);
            return {
                ...deduped,
                meta: {
                    ...deduped.meta,
                    hotspots
                }
            };
        });
    }
}
//# sourceMappingURL=skill-synthesizer.js.map