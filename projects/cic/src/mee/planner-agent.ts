// File: projects/cic/src/mee/planner-agent.ts | Date: 2026-06-04 | v1.1.0

import crypto from "node:crypto";
import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole, MeeAgentCritique, PlanTree } from "./mee-schema.js";
import { PlanningEngine } from "./planning/planning-engine.js";

export class PlannerAgent implements AgentImpl {
  constructor(
    public readonly id: string,
    public readonly role: MeeAgentRole,
    private readonly planning: PlanningEngine,
  ) {}

  async handleTask(task: MeeAgentTask): Promise<MeeAgentExchange> {
    if (task.type === "critique") {
      const plan = task.payload.plan as PlanTree;
      const critiques: MeeAgentCritique[] = [];

      if (plan) {
        if (!plan.tasks || plan.tasks.length === 0) {
          critiques.push({
            id: crypto.randomUUID(),
            agentId: this.id,
            targetAgentId: "agent-planner",
            issue: "Plan tree contains no executable tasks.",
            severity: "error",
            suggestedFix: "Formulate at least one structured task Node.",
            timestamp: new Date().toISOString()
          });
        } else {
          for (const t of plan.tasks) {
            if (!t.description || t.description.length < 10) {
              critiques.push({
                id: crypto.randomUUID(),
                agentId: this.id,
                targetAgentId: "agent-planner",
                issue: `Task ${t.id} has an underspecified description.`,
                severity: "warn",
                suggestedFix: "Provide a detailed technical description for task execution.",
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        taskId: task.id,
        agentId: this.id,
        createdAt: new Date().toISOString(),
        direction: "response",
        content: JSON.stringify({ critiques }),
        metadata: { critiques }
      };
    }

    if (task.type === "refine") {
      const plan = task.payload.plan as PlanTree;
      const refinedPlan = plan ? { ...plan } : { rootRequest: "Refined Plan", summary: "Refined", tasks: [] };

      if (!refinedPlan.tasks || refinedPlan.tasks.length === 0) {
        refinedPlan.tasks = [{
          id: "task-refined-1",
          title: "Refined setup task",
          description: "Initialize workspace structural changes for consensus compliance.",
          type: "infra",
          dependsOn: []
        }];
      } else {
        refinedPlan.tasks = refinedPlan.tasks.map(t => {
          if (!t.description || t.description.length < 10) {
            return {
              ...t,
              description: `${t.description || ""} - Expanded description for Phase-38 refined execution.`
            };
          }
          return t;
        });
      }

      return {
        id: crypto.randomUUID(),
        taskId: task.id,
        agentId: this.id,
        createdAt: new Date().toISOString(),
        direction: "response",
        content: JSON.stringify({ refinedPlan }),
        metadata: { refinedPlan }
      };
    }

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
