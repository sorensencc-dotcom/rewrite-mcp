// File: projects/cic/tests/mee/llm-planning-engine.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect } from "vitest";
import { LLMPlanningEngine } from "../../src/mee/planning/llm-planning-engine.js";

describe("LLMPlanningEngine", () => {
  it("generates a plan using mock LLM client", async () => {
    const mockClient = {
      generatePlan: async (input: any) => {
        return {
          rootRequest: input.request,
          summary: "Mock plan",
          tasks: [
            {
              id: "task-1",
              title: "Mock task",
              description: "Mock task description",
              type: "feature" as const,
              dependsOn: [],
            },
          ],
        };
      },
    };

    const engine = new LLMPlanningEngine(mockClient);
    const plan = await engine.generatePlan("Build mock feature");

    expect(plan.rootRequest).toBe("Build mock feature");
    expect(plan.summary).toBe("Mock plan");
    expect(plan.tasks.length).toBe(1);
    expect(plan.tasks[0].title).toBe("Mock task");
  });
});
