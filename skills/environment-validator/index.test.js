import { describe, it, expect } from "vitest";
import { validateEnvironment } from "./index.js";

describe("Environment Validator (45.3)", () => {
  it("should return health check results", () => {
    const result = validateEnvironment();

    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("overallHealth");
    expect(result).toHaveProperty("startupReady");
    expect(result).toHaveProperty("checks");
    expect(result).toHaveProperty("recommendations");
  });

  it("should perform Node.js version check", () => {
    const result = validateEnvironment();
    const nodeCheck = result.checks.find((c) => c.check.includes("Node.js"));

    expect(nodeCheck).toBeDefined();
    expect(nodeCheck.value).toBeDefined();
    expect(nodeCheck.passed).toBe(true);
  });

  it("should check critical paths", () => {
    const result = validateEnvironment();
    const pathsCheck = result.checks.find((c) => c.check.includes("paths"));

    expect(pathsCheck).toBeDefined();
    expect(pathsCheck.paths).toBeDefined();
    expect(Array.isArray(pathsCheck.paths)).toBe(true);
  });

  it("should indicate startup readiness", () => {
    const result = validateEnvironment();

    expect(typeof result.startupReady).toBe("boolean");
    expect(typeof result.overallHealth).toBe("string");
    expect(["healthy", "degraded"].includes(result.overallHealth)).toBe(true);
  });

  it("should complete health check quickly", () => {
    const result = validateEnvironment();

    expect(result.elapsedMs).toBeLessThan(500);
  });
});
