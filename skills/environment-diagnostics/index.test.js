import { describe, it, expect } from "vitest";
import { diagnosticsEnvironment } from "./index.js";

describe("environment-diagnostics", () => {
  it("requires logs and systemInfo", () => {
    expect(() => diagnosticsEnvironment({})).toThrow("logs is required");
  });

  it("detects MSIX issues", () => {
    const result = diagnosticsEnvironment({
      logs: ["Error: MSIX package not found"],
      systemInfo: { os: "Windows 11" }
    });
    expect(result.issuesFound).toBeGreaterThan(0);
    expect(result.issues.some(i => i.includes("MSIX"))).toBe(true);
  });

  it("detects WSL2 issues", () => {
    const result = diagnosticsEnvironment({
      logs: ["WSL service timeout"],
      systemInfo: { os: "Windows 11", wsl: "offline" }
    });
    expect(result.issuesFound).toBeGreaterThan(0);
    expect(result.issues.some(i => i.includes("WSL"))).toBe(true);
  });

  it("returns healthy status when no issues", () => {
    const result = diagnosticsEnvironment({
      logs: ["All systems operational"],
      systemInfo: { os: "Windows 11" }
    });
    expect(result.overallHealth).toBe("healthy");
  });
});
