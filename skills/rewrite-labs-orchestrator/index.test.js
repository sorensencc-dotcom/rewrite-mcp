import { describe, it, expect } from "vitest";
import { orchestratePipeline } from "./index.js";

describe("rewrite-labs-orchestrator", () => {
  it("requires pipelineState", () => {
    expect(() => orchestratePipeline({})).toThrow("pipelineState is required");
  });

  it("tracks stage progress", () => {
    const result = orchestratePipeline({
      pipelineState: {
        stages: [
          { name: "capture", status: "complete" },
          { name: "extract", status: "complete" },
          { name: "compare", status: "running" }
        ]
      }
    });
    expect(result.totalStages).toBe(3);
    expect(result.completedStages).toBe(2);
    expect(result.progressPercent).toBeGreaterThan(50);
  });

  it("detects blocked stages", () => {
    const result = orchestratePipeline({
      pipelineState: {
        stages: [
          { name: "benchmark", status: "blocked" },
          { name: "report", status: "pending" }
        ]
      }
    });
    expect(result.blockedStages).toBe(1);
    expect(result.blockedStageNames).toContain("benchmark");
    expect(result.nextSteps[0]).toMatch(/Unblock/);
  });
});
