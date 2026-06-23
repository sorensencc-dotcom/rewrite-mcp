"use strict";
// File: projects/cic/src/mee/planning/plan-to-proposal.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanToProposal = void 0;
class PlanToProposal {
    toProposal(task) {
        return {
            id: `task-${task.id}`,
            title: task.title,
            status: "planned",
            filesCreated: [],
            planSummary: task.description,
            timestamp: Date.now()
        };
    }
}
exports.PlanToProposal = PlanToProposal;
//# sourceMappingURL=plan-to-proposal.js.map