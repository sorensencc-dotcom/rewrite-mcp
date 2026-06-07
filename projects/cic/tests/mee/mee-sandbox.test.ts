// File: projects/cic/tests/mee/mee-sandbox.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { MeeSandboxEngine } from "../../src/mee/safety/sandbox-engine.js";
import { PhasePatch } from "../../src/mee/mee-schema.js";

describe("MeeSandboxEngine", () => {
  it("executes mock sandbox verification and returns mock results", async () => {
    const engine = new MeeSandboxEngine({ mockExec: true, mockResult: true });
    const patches: PhasePatch[] = [
      { path: "projects/cic/src/mee/mee-schema.ts", type: "modify", content: "// mock edit" }
    ];

    const result = await engine.validate(patches);
    expect(result.passed).toBe(true);
    expect(result.compilePassed).toBe(true);
    expect(result.testsPassed).toBe(true);
    expect(result.output).toContain("Mock sandbox validation output.");
  });

  it("handles mock sandbox failures", async () => {
    const engine = new MeeSandboxEngine({ mockExec: true, mockResult: false });
    const patches: PhasePatch[] = [];

    const result = await engine.validate(patches);
    expect(result.passed).toBe(false);
    expect(result.compilePassed).toBe(false);
    expect(result.testsPassed).toBe(false);
  });
});
