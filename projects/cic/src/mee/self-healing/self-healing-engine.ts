// File: projects/cic/src/mee/self-healing/self-healing-engine.ts | Date: 2026-06-04 | v1.0.0

import crypto from "node:crypto";
import { MeeHealingPlan, MeeRunFailureContext, MeeAutonomousJob, PlanTree } from "../mee-schema.js";

export interface HealingLLMClient {
  suggestHealing(input: {
    request: string;
    plan: PlanTree;
    failure: MeeRunFailureContext;
  }): Promise<{
    summary: string;
    tasks: { title: string; description: string; type: string }[];
  }>;
}

export class SelfHealingEngine {
  constructor(private readonly client: HealingLLMClient) {}

  async generateHealingPlan(
    job: MeeAutonomousJob,
    plan: PlanTree,
    failure: MeeRunFailureContext
  ): Promise<MeeHealingPlan> {
    const suggestion = await this.client.suggestHealing({
      request: job.request,
      plan,
      failure,
    });

    return {
      id: crypto.randomUUID(),
      parentJobId: job.id,
      createdAt: new Date().toISOString(),
      summary: suggestion.summary,
      suggestedTasks: suggestion.tasks,
    };
  }
}
