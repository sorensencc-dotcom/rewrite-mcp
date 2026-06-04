// File: projects/cic/src/mee/planning/llm-planning-engine.ts | Date: 2026-06-04 | v1.0.0

import { PlanTree } from "../mee-schema.js";

export interface LLMClient {
  generatePlan(input: {
    request: string;
    repoSummary?: string;
    recentFailures?: string;
  }): Promise<PlanTree>;
}

export class LLMPlanningEngine {
  constructor(private readonly client: LLMClient) {}

  async generatePlan(
    request: string,
    opts?: { repoSummary?: string; recentFailures?: string }
  ): Promise<PlanTree> {
    return this.client.generatePlan({
      request,
      repoSummary: opts?.repoSummary,
      recentFailures: opts?.recentFailures,
    });
  }
}
