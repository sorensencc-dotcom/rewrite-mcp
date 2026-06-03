// File: projects/cic/src/mee/planning/planning-engine.ts | Date: 2026-06-03 | v1.0.0

import { PlanTask, PlanTree, PhaseProposal } from "../mee-schema.js";
import { TaskExtractor } from "./task-extractor.js";
import { DependencyDetector } from "./dependency-detector.js";
import { PlanToProposal } from "./plan-to-proposal.js";

export class PlanningEngine {
  private readonly extractor = new TaskExtractor();
  private readonly deps = new DependencyDetector();
  private readonly converter = new PlanToProposal();

  generatePlan(request: string): PlanTree {
    const tasks = this.extractor.extractTasks(request);
    const ordered = this.deps.orderTasks(tasks);

    return {
      rootRequest: request,
      tasks: ordered,
      summary: `Generated ${ordered.length} tasks from request`,
    };
  }

  generateProposals(plan: PlanTree): PhaseProposal[] {
    return plan.tasks.map((t) => this.converter.toProposal(t));
  }
}
