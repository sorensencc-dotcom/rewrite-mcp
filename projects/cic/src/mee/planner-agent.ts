// File: projects/cic/src/mee/planner-agent.ts | Date: 2026-06-04 | v1.0.0

import crypto from "node:crypto";
import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole } from "./mee-schema.js";
import { PlanningEngine } from "./planning/planning-engine.js";

export class PlannerAgent implements AgentImpl {
  constructor(
    public readonly id: string,
    public readonly role: MeeAgentRole,
    private readonly planning: PlanningEngine,
  ) {}

  async handleTask(task: MeeAgentTask): Promise<MeeAgentExchange> {
    const planInput = task.payload.plan ? (task.payload.plan as any).rootRequest : String(task.payload.request ?? "");
    const plan = await this.planning.generatePlanWithMode(
      planInput,
      task.payload.planningMode as any
    );

    return {
      id: crypto.randomUUID(),
      taskId: task.id,
      agentId: this.id,
      createdAt: new Date().toISOString(),
      direction: "response",
      content: JSON.stringify({ refinedPlan: plan }),
    };
  }
}
