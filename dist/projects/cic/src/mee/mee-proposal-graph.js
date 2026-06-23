"use strict";
// File: projects/cic/src/mee/mee-proposal-graph.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeProposalGraph = void 0;
class MeeProposalGraph {
    constructor(synth, validator) {
        this.synth = synth;
        this.validator = validator;
    }
    buildGraph(proposals) {
        const nodes = proposals.map((p) => ({
            id: p.id,
            proposal: p,
            patchSet: this.synth.synthesize(p),
        }));
        const edges = [];
        const conflicts = [];
        // Detect conflicts based on pa.path === pb.path
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                if (a.patchSet && b.patchSet) {
                    for (const pa of a.patchSet.patches) {
                        for (const pb of b.patchSet.patches) {
                            if (pa.path === pb.path) {
                                conflicts.push({
                                    proposalA: a.id,
                                    proposalB: b.id,
                                    path: pa.path,
                                    type: "overwrite",
                                });
                            }
                        }
                    }
                }
            }
        }
        // Dependency edges (simple heuristic matching "Phase XX" in titles)
        for (const node of nodes) {
            if (node.proposal.title.includes("Phase")) {
                const match = node.proposal.title.match(/Phase\s*(\d+)/i);
                if (match) {
                    const phaseNum = Number(match[1]);
                    const prev = nodes.find((n) => {
                        const m = n.proposal.title.match(/Phase\s*(\d+)/i);
                        return m && Number(m[1]) === phaseNum - 1;
                    });
                    if (prev) {
                        edges.push({
                            from: prev.id,
                            to: node.id,
                            reason: `Sequential phase dependency (Phase ${phaseNum - 1} -> Phase ${phaseNum})`,
                        });
                    }
                }
            }
        }
        return { nodes, edges, conflicts };
    }
    topologicalSort(graph) {
        const incoming = new Map();
        graph.nodes.forEach((n) => incoming.set(n.id, 0));
        graph.edges.forEach((e) => {
            if (incoming.has(e.to)) {
                incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
            }
        });
        const queue = graph.nodes.filter((n) => incoming.get(n.id) === 0);
        const result = [];
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node);
            for (const edge of graph.edges.filter((e) => e.from === node.id)) {
                if (incoming.has(edge.to)) {
                    const count = incoming.get(edge.to) - 1;
                    incoming.set(edge.to, count);
                    if (count === 0) {
                        const nextNode = graph.nodes.find((n) => n.id === edge.to);
                        if (nextNode)
                            queue.push(nextNode);
                    }
                }
            }
        }
        // Append any isolated or cyclic nodes so we don't leave them out
        if (result.length < graph.nodes.length) {
            for (const node of graph.nodes) {
                if (!result.some((r) => r.id === node.id)) {
                    result.push(node);
                }
            }
        }
        return result;
    }
}
exports.MeeProposalGraph = MeeProposalGraph;
//# sourceMappingURL=mee-proposal-graph.js.map