// File: projects/cic/tests/mee/mee-planning.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { PlanningEngine } from "../../src/mee/planning/planning-engine.js";

describe("PlanningEngine", () => {
  it("generates tasks from a request", () => {
    const engine = new PlanningEngine();
    const plan = engine.generatePlan("Add extractor and update validator");
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  it("orders tasks with dependencies", () => {
    const engine = new PlanningEngine();
    const plan = engine.generatePlan("Add extractor and update validator");
    const tests = plan.tasks.filter((t) => t.type === "test");
    const featuresAndRefactors = plan.tasks.filter((t) => t.type === "feature" || t.type === "refactor");
    for (const test of tests) {
      expect(test.dependsOn.length).toBe(featuresAndRefactors.length);
    }
  });
});
