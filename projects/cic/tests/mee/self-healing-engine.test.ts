// File: projects/cic/tests/mee/self-healing-engine.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect } from "vitest";
import { SelfHealingEngine } from "../../src/mee/self-healing/self-healing-engine.js";

describe("SelfHealingEngine", () => {
  it("generates a healing plan using mock LLM client", async () => {
    const mockClient = {
      suggestHealing: async (input: any) => {
        return {
          summary: "Mock healing plan",
          tasks: [
            {
              title: "Mock fix",
              description: "Mock fix description",
              type: "fix",
            },
          ],
        };
      },
    };

    const engine = new SelfHealingEngine(mockClient);
    const mockJob = {
      id: "job-1",
      createdAt: "",
      updatedAt: "",
      status: "failed" as const,
      request: "Build target feature",
      proposalIds: [],
    };
    const mockPlan = {
      rootRequest: "Build target feature",
      summary: "Original plan",
      tasks: [],
    };
    const mockFailure = {
      runId: "run-1",
      jobId: "job-1",
      createdAt: "",
      failingProposalIds: ["prop-1"],
      errorMessage: "Build failed",
    };

    const healingPlan = await engine.generateHealingPlan(mockJob, mockPlan, mockFailure);

    expect(healingPlan.parentJobId).toBe("job-1");
    expect(healingPlan.summary).toBe("Mock healing plan");
    expect(healingPlan.suggestedTasks.length).toBe(1);
    expect(healingPlan.suggestedTasks[0].title).toBe("Mock fix");
  });
});
