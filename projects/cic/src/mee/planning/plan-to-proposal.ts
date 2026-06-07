// File: projects/cic/src/mee/planning/plan-to-proposal.ts | Date: 2026-06-03 | v1.0.0

import { PlanTask, PhaseProposal } from "../mee-schema.js";

export class PlanToProposal {
  toProposal(task: PlanTask): PhaseProposal {
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
