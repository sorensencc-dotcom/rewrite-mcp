"use strict";
// File: projects/cic/evolution/src/distillationEngine.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeDistillationEngine = void 0;
class KnowledgeDistillationEngine {
    constructor(store) {
        this.store = store;
    }
    runDistillation(stalenessThresholdMs = 14 * 24 * 60 * 60 * 1000) {
        const graph = this.store.load();
        const originalNodes = [...graph.nodes];
        const originalEdges = [...graph.edges];
        const candidates = [];
        const protectedNodeIds = new Set();
        // Identify protected nodes (schemas, active rules, active tenants, explicitly flagged)
        for (const node of originalNodes) {
            if (node.type === "schema" ||
                node.type === "meta_rule" ||
                node.type === "tenant" ||
                node.type === "benchmark" ||
                node.meta?.protected === true) {
                protectedNodeIds.add(node.id);
            }
        }
        const now = Date.now();
        const staleNodes = [];
        const redundantGroups = [];
        const processedRedundant = new Set();
        // 1. Identify Stale Nodes
        for (const node of originalNodes) {
            if (protectedNodeIds.has(node.id))
                continue;
            // Check timestamps on transient nodes (tasks, failures, metrics, proposals)
            if (["task", "failure", "verification_metrics", "proposal"].includes(node.type)) {
                let nodeTimestamp = now;
                if (node.meta?.timestamp) {
                    nodeTimestamp = Number(node.meta.timestamp);
                }
                else if (node.meta?.createdAt) {
                    nodeTimestamp = new Date(node.meta.createdAt).getTime();
                }
                if (now - nodeTimestamp > stalenessThresholdMs) {
                    staleNodes.push(node);
                    candidates.push({
                        nodeId: node.id,
                        type: node.type,
                        action: "delete",
                        reason: `Node age exceeds staleness threshold of ${stalenessThresholdMs}ms`
                    });
                }
            }
        }
        const staleNodeIds = new Set(staleNodes.map(n => n.id));
        // 2. Identify Redundant Nodes (e.g. highly similar capabilities or duplicate failures)
        for (const node of originalNodes) {
            if (protectedNodeIds.has(node.id) || staleNodeIds.has(node.id) || processedRedundant.has(node.id)) {
                continue;
            }
            if (node.type === "capability" || node.type === "failure") {
                const matchingGroup = originalNodes.filter(n => {
                    if (n.id === node.id || n.type !== node.type || protectedNodeIds.has(n.id) || staleNodeIds.has(n.id) || processedRedundant.has(n.id)) {
                        return false;
                    }
                    // Match by name overlap or similar heuristic
                    if (node.type === "failure") {
                        // Group duplicate failure codes
                        return n.name === node.name && n.meta?.message === node.meta?.message;
                    }
                    else {
                        // Group highly similar capabilities
                        const words1 = node.name.toLowerCase().split(/\s+/);
                        const words2 = n.name.toLowerCase().split(/\s+/);
                        const intersection = words1.filter(w => words2.includes(w));
                        const jaccard = intersection.length / Array.from(new Set([...words1, ...words2])).length;
                        return jaccard > 0.8; // High word similarity
                    }
                });
                if (matchingGroup.length > 0) {
                    processedRedundant.add(node.id);
                    matchingGroup.forEach(n => {
                        processedRedundant.add(n.id);
                        candidates.push({
                            nodeId: n.id,
                            type: n.type,
                            action: "merge",
                            reason: `Duplicate or highly similar to ${node.id}`,
                            mergeTargetId: node.id
                        });
                    });
                    redundantGroups.push([node, ...matchingGroup]);
                }
            }
        }
        // 3. Construct Compressed Graph (Without modifying the actual store)
        const compressedNodes = [];
        const compressedEdges = [];
        const mergeMap = new Map(); // source -> target
        // Set up merge mappings
        for (const cand of candidates) {
            if (cand.action === "merge" && cand.mergeTargetId) {
                mergeMap.set(cand.nodeId, cand.mergeTargetId);
            }
        }
        // Filter nodes
        for (const node of originalNodes) {
            if (staleNodeIds.has(node.id)) {
                continue; // Exclude deleted nodes
            }
            if (mergeMap.has(node.id)) {
                continue; // Exclude merged nodes (they roll into the target)
            }
            compressedNodes.push(node);
        }
        // Combine metadata for merged nodes
        for (const group of redundantGroups) {
            const target = compressedNodes.find(n => n.id === group[0].id);
            if (target) {
                const mergedMeta = { ...target.meta };
                if (target.type === "failure") {
                    let count = 1;
                    for (let i = 1; i < group.length; i++) {
                        count += (group[i].meta?.count || 1);
                    }
                    mergedMeta.count = (mergedMeta.count || 1) + count - 1;
                }
                else {
                    mergedMeta.mergedFrom = group.slice(1).map(n => n.id);
                }
                target.meta = mergedMeta;
            }
        }
        // Map and filter edges
        for (const edge of originalEdges) {
            const fromStale = staleNodeIds.has(edge.from);
            const toStale = staleNodeIds.has(edge.to);
            if (fromStale || toStale) {
                continue; // Exclude edges connected to deleted nodes
            }
            // Reroute merged node connections
            const mappedFrom = mergeMap.get(edge.from) || edge.from;
            const mappedTo = mergeMap.get(edge.to) || edge.to;
            if (mappedFrom === mappedTo) {
                continue; // Avoid self-loops after merge
            }
            // Prevent duplicate edges
            const edgeExists = compressedEdges.some(e => e.from === mappedFrom && e.to === mappedTo && e.type === edge.type);
            if (!edgeExists) {
                compressedEdges.push({
                    from: mappedFrom,
                    to: mappedTo,
                    type: edge.type,
                    meta: edge.meta
                });
            }
        }
        const staleCount = staleNodes.length;
        const redundantCount = candidates.filter(c => c.action === "merge").length;
        const totalOriginal = originalNodes.length + originalEdges.length;
        const totalCompressed = compressedNodes.length + compressedEdges.length;
        const compressionRatio = totalOriginal > 0 ? (totalOriginal - totalCompressed) / totalOriginal : 0;
        const report = {
            timestamp: now,
            metrics: {
                originalNodesCount: originalNodes.length,
                originalEdgesCount: originalEdges.length,
                staleNodesFound: staleCount,
                redundantNodesFound: redundantCount,
                estimatedCompressionRatio: parseFloat(compressionRatio.toFixed(3))
            }
        };
        return {
            report,
            candidates,
            compressedGraph: {
                nodes: compressedNodes,
                edges: compressedEdges
            }
        };
    }
}
exports.KnowledgeDistillationEngine = KnowledgeDistillationEngine;
//# sourceMappingURL=distillationEngine.js.map