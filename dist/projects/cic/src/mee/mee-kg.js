"use strict";
// File: projects/cic/src/mee/mee-kg.ts | Date: 2026-06-04 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeKnowledgeGraph = void 0;
class MeeKnowledgeGraph {
    constructor(store) {
        this.store = store;
    }
    recordTaskNode(taskId, title, type, dependsOn) {
        this.store.appendNode({
            id: taskId,
            type: "task",
            name: title,
            meta: { taskType: type }
        });
        for (const dep of dependsOn) {
            this.store.appendEdge({
                from: taskId,
                to: dep,
                type: "depends_on"
            });
        }
    }
    recordProposalNode(proposalId, title, planSummary, filesCreated) {
        this.store.appendNode({
            id: proposalId,
            type: "proposal",
            name: title,
            meta: { planSummary }
        });
        for (const file of filesCreated) {
            this.store.appendNode({
                id: file,
                type: "file",
                name: file
            });
            this.store.appendEdge({
                from: proposalId,
                to: file,
                type: "refines"
            });
        }
    }
    recordCritiqueEdge(proposalId, critique) {
        this.store.appendNode({
            id: critique.agentId,
            type: "agent",
            name: critique.agentId
        });
        this.store.appendEdge({
            from: proposalId,
            to: critique.agentId,
            type: "critique_by",
            meta: { severity: critique.severity, issue: critique.issue }
        });
    }
    recordFailureNode(failureId, proposalId, errorCode, message) {
        this.store.appendNode({
            id: failureId,
            type: "failure",
            name: errorCode,
            meta: { message }
        });
        this.store.appendEdge({
            from: proposalId,
            to: failureId,
            type: "caused_failure"
        });
    }
    recordHealingEdge(healingProposalId, failureId) {
        this.store.appendEdge({
            from: healingProposalId,
            to: failureId,
            type: "fixed_by"
        });
    }
    recordVerificationMetricsNode(proposalId, metrics) {
        this.store.appendNode({
            id: `metrics-${proposalId}`,
            type: "verification_metrics",
            name: `Metrics for ${proposalId}`,
            meta: {
                testCount: metrics.testCount,
                passed: metrics.passed,
                durationMs: metrics.durationMs,
                validationErrorsCount: metrics.validationErrorsCount,
                timestamp: Date.now()
            }
        });
        this.store.appendEdge({
            from: proposalId,
            to: `metrics-${proposalId}`,
            type: "has_metrics"
        });
    }
    getFragileModules() {
        const graph = this.store.load();
        const failures = graph.nodes.filter(n => n.type === "failure");
        const counts = new Map();
        for (const fail of failures) {
            const edgeToFail = graph.edges.find(e => e.to === fail.id && e.type === "caused_failure");
            if (edgeToFail) {
                const proposalId = edgeToFail.from;
                const refinesEdges = graph.edges.filter(e => e.from === proposalId && e.type === "refines");
                for (const edge of refinesEdges) {
                    const filePath = edge.to;
                    counts.set(filePath, (counts.get(filePath) || 0) + 1);
                }
            }
        }
        return Array.from(counts.entries())
            .map(([path, failureCount]) => ({ path, failureCount }))
            .sort((a, b) => b.failureCount - a.failureCount);
    }
    getSafetyRisks() {
        const graph = this.store.load();
        const critiques = graph.edges.filter(e => e.type === "critique_by" && e.meta?.severity === "error");
        return Array.from(new Set(critiques.map(c => c.meta?.issue || ""))).filter(Boolean);
    }
    getGraph() {
        return this.store.load();
    }
}
exports.MeeKnowledgeGraph = MeeKnowledgeGraph;
//# sourceMappingURL=mee-kg.js.map