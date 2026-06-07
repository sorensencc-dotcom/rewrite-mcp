// File: projects/cic/tests/mee/mee-self-refactor.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { SelfRefactorEngine } from "../../src/mee/self-refactor/self-refactor-engine.js";
import { RefactorInsight } from "../../src/mee/mee-schema.js";

describe("SelfRefactorEngine", () => {
  it("scans file contents and returns insights", () => {
    const engine = new SelfRefactorEngine();
    const insights = engine.scan([
      {
        path: "src/test.ts",
        content: "const a = 1; // unused"
      }
    ]);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].type).toBe("dead_code");
  });

  it("generates a plan and proposal from insights", () => {
    const engine = new SelfRefactorEngine();
    const insights: RefactorInsight[] = [
      {
        id: "1",
        file: "src/foo.ts",
        type: "complexity",
        message: "High complexity",
        severity: "high",
      },
      {
        id: "2",
        file: "src/bar.ts",
        type: "unused_import",
        message: "Unused import: 'x'",
        severity: "low"
      }
    ];

    const plan = engine.generatePlan(insights);
    expect(plan.patches.length).toBe(2);
    expect(plan.patches[0].path).toBe("src/foo.ts");
    expect(plan.patches[0].type).toBe("modify");
    expect(plan.patches[1].path).toBe("src/bar.ts");
    expect(plan.patches[1].type).toBe("modify");
    expect(plan.summary).toContain("Generated 2 refactor patches");

    const proposal = engine.toProposal(plan);
    expect(proposal.id).toContain("refactor-");
    expect(proposal.title).toBe("CIC Self-Refactor Plan");
    expect(proposal.status).toBe("pending");
    expect(proposal.refactorPlan).toEqual(plan);
  });
});
