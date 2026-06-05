import { describe, it, expect } from "vitest";
import { generateProcedure } from "./index.js";

describe("operator-grade-procedures", () => {
  it("requires task and environment", () => {
    expect(() => generateProcedure({})).toThrow("task is required");
  });

  it("generates step-by-step procedure", () => {
    const result = generateProcedure({
      task: "Deploy to production",
      environment: { name: "prod", osType: "Linux" }
    });
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].num).toBe(1);
    expect(result.task).toBe("Deploy to production");
  });

  it("includes validation checks", () => {
    const result = generateProcedure({
      task: "Test suite",
      environment: { name: "test" }
    });
    expect(result.validationChecks.length).toBeGreaterThan(0);
    expect(result.validationChecks[0]).toContain("Output");
  });

  it("includes error branches with fallbacks", () => {
    const result = generateProcedure({
      task: "Any task",
      environment: { name: "default" }
    });
    expect(result.errorBranches.length).toBeGreaterThan(0);
    expect(result.errorBranches[0].fallback).toBeDefined();
  });
});
