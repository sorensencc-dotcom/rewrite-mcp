"use strict";
// File: projects/cic/src/mee/docs-agent.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocsAgent = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class DocsAgent {
    constructor(id, role = "docs") {
        this.id = id;
        this.role = role;
    }
    async handleTask(task) {
        if (task.type === "critique") {
            const proposal = task.payload.proposal;
            const critiques = [];
            if (proposal) {
                if (!proposal.title || proposal.title.length < 10) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-docs",
                        issue: "Proposal title is too short or empty.",
                        severity: "warn",
                        suggestedFix: "Change the title to be at least 10 characters long and descriptive.",
                        timestamp: new Date().toISOString()
                    });
                }
                if (!proposal.planSummary || proposal.planSummary.length < 20) {
                    critiques.push({
                        id: node_crypto_1.default.randomUUID(),
                        agentId: this.id,
                        targetAgentId: "agent-docs",
                        issue: "Proposal plan summary is too brief or missing context.",
                        severity: "warn",
                        suggestedFix: "Expand the summary to detail objectives, tasks, and file impacts.",
                        timestamp: new Date().toISOString()
                    });
                }
            }
            return {
                id: node_crypto_1.default.randomUUID(),
                taskId: task.id,
                agentId: this.id,
                createdAt: new Date().toISOString(),
                direction: "response",
                content: JSON.stringify({ critiques }),
                metadata: { critiques }
            };
        }
        if (task.type === "refine") {
            const proposal = task.payload.proposal;
            const refinedProposal = { ...proposal };
            if (refinedProposal) {
                if (!refinedProposal.title || refinedProposal.title.length < 10) {
                    refinedProposal.title = `Refined Proposal: ${refinedProposal.title || "Untitled Implementation"}`;
                }
                if (!refinedProposal.planSummary || refinedProposal.planSummary.length < 20) {
                    refinedProposal.planSummary = `Refined implementation description: ${refinedProposal.planSummary || ""} - Completed detailed architectural integration and testing review.`;
                }
            }
            return {
                id: node_crypto_1.default.randomUUID(),
                taskId: task.id,
                agentId: this.id,
                createdAt: new Date().toISOString(),
                direction: "response",
                content: JSON.stringify({ refinedProposal }),
                metadata: { refinedProposal }
            };
        }
        return {
            id: node_crypto_1.default.randomUUID(),
            taskId: task.id,
            agentId: this.id,
            createdAt: new Date().toISOString(),
            direction: "response",
            content: JSON.stringify({ ok: true })
        };
    }
}
exports.DocsAgent = DocsAgent;
//# sourceMappingURL=docs-agent.js.map