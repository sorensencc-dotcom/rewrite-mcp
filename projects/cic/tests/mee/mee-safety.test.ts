// File: projects/cic/tests/mee/mee-safety.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { MeeSafetyEngine } from "../../src/mee/safety/safety-engine.js";
import { PhasePatch } from "../../src/mee/mee-schema.js";

describe("MeeSafetyEngine", () => {
  it("classifies simple file edits as low risk and passes", () => {
    const engine = new MeeSafetyEngine();
    const patches: PhasePatch[] = [
      { path: "projects/cic/src/mee/mee-trigger.ts", type: "modify", content: "console.log('test');" }
    ];

    const report = engine.analyze(patches);
    expect(report.passed).toBe(true);
    expect(report.riskLevel).toBe("low");
    expect(report.issues.length).toBe(0);
  });

  it("classifies multi-file modifications as medium risk and passes", () => {
    const engine = new MeeSafetyEngine();
    const patches: PhasePatch[] = [
      { path: "projects/cic/src/mee/a.ts", type: "modify", content: "a" },
      { path: "projects/cic/src/mee/b.ts", type: "modify", content: "b" },
      { path: "projects/cic/src/mee/c.ts", type: "modify", content: "c" },
      { path: "projects/cic/src/mee/d.ts", type: "modify", content: "d" }
    ];

    const report = engine.analyze(patches);
    expect(report.passed).toBe(true);
    expect(report.riskLevel).toBe("medium");
    expect(report.issues.length).toBe(1);
    expect(report.issues[0]).toContain("Proposal modifies multiple files");
  });

  it("classifies sensitive file edits (package.json) as high risk and blocks", () => {
    const engine = new MeeSafetyEngine();
    const patches: PhasePatch[] = [
      { path: "projects/cic/package.json", type: "modify", content: "{}" }
    ];

    const report = engine.analyze(patches);
    expect(report.passed).toBe(false);
    expect(report.riskLevel).toBe("high");
    expect(report.issues.length).toBe(1);
    expect(report.issues[0]).toContain("Modification of sensitive configuration file detected");
  });

  it("classifies forbidden runtime patterns (eval) as critical risk and blocks", () => {
    const engine = new MeeSafetyEngine();
    const patches: PhasePatch[] = [
      { path: "projects/cic/src/mee/exec.ts", type: "modify", content: "const a = eval('1+1');" }
    ];

    const report = engine.analyze(patches);
    expect(report.passed).toBe(false);
    expect(report.riskLevel).toBe("critical");
    expect(report.issues.length).toBe(1);
    expect(report.issues[0]).toContain("Forbidden pattern \"eval()\" detected");
  });
});
