// File: projects/cic/tests/mee/mee-static-analysis.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { StaticAnalysisEngine } from "../../src/mee/self-refactor/static-analysis.js";

describe("StaticAnalysisEngine", () => {
  it("produces complexity insights for complex files", () => {
    const engine = new StaticAnalysisEngine();
    const src = `
      function f(x) {
        if (x) {
          if (x > 1) {
            if (x > 2) {
              for (let i = 0; i < 10; i++) {
                while (x < 100) {
                  x++;
                }
              }
            }
          }
        }
      }
    `;
    const insights = engine.analyzeFile("src/test.ts", src);
    expect(insights.some((i) => i.type === "complexity")).toBe(true);
  });

  it("detects unused imports and unused local variables", () => {
    const engine = new StaticAnalysisEngine();
    const src = `
      import { unusedFunc } from "./utils.js";
      const x = 10; // Unused local
      export const y = 20; // Exported, not unused
      function localFunc() {
        // Unused local function
      }
      export function expFunc() {
        return y;
      }
    `;
    const insights = engine.analyzeFile("src/test.ts", src);
    expect(insights.some((i) => i.type === "unused_import" && i.message.includes("unusedFunc"))).toBe(true);
    expect(insights.some((i) => i.type === "dead_code" && i.message.includes("x"))).toBe(true);
    expect(insights.some((i) => i.type === "dead_code" && i.message.includes("localFunc"))).toBe(true);
    expect(insights.some((i) => i.message.includes("y"))).toBe(false);
  });

  it("detects code duplication inside a file", () => {
    const engine = new StaticAnalysisEngine();
    const src = `
      function a() {
        console.log("hello world");
        console.log("this is a duplicate block of code");
        console.log("it should be detected by the engine");
        console.log("because it is repeated exactly");
        console.log("more than five times in this file");
      }

      function b() {
        console.log("hello world");
        console.log("this is a duplicate block of code");
        console.log("it should be detected by the engine");
        console.log("because it is repeated exactly");
        console.log("more than five times in this file");
      }
    `;
    const insights = engine.analyzeFile("src/test.ts", src);
    expect(insights.some((i) => i.type === "duplication")).toBe(true);
  });

  it("detects layer violations / architectural drift", () => {
    const engine = new StaticAnalysisEngine();
    const src = `
      import { Sidebar } from "../../ui/src/components/Sidebar.js";
      export function coreLogic() {
        return Sidebar;
      }
    `;
    const insights = engine.analyzeFile("projects/cic/src/mee/submodule.ts", src);
    expect(insights.some((i) => i.type === "drift" && i.severity === "critical")).toBe(true);
  });
});
