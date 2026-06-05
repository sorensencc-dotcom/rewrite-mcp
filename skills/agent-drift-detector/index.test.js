import { describe, it, expect } from "vitest";
import { detectDrift } from "./index.js";

describe("agent-drift-detector", () => {
  it("requires all parameters", () => {
    expect(() => detectDrift({})).toThrow("agentName is required");
  });

  it("detects missing fields", () => {
    const result = detectDrift({
      agentName: "test-agent",
      expectedSchema: { field1: "string", field2: "number" },
      actualSchema: { field1: "string" }
    });
    expect(result.driftDetected).toBe(true);
    expect(result.missingFields).toContain("field2");
  });

  it("detects extra fields", () => {
    const result = detectDrift({
      agentName: "test-agent",
      expectedSchema: { field1: "string" },
      actualSchema: { field1: "string", field2: "extra" }
    });
    expect(result.driftDetected).toBe(true);
    expect(result.extraFields).toContain("field2");
  });

  it("returns aligned schema status", () => {
    const result = detectDrift({
      agentName: "test-agent",
      expectedSchema: { a: 1, b: 2 },
      actualSchema: { a: 1, b: 2 }
    });
    expect(result.driftDetected).toBe(false);
    expect(result.recommendations).toContain("Schema is aligned");
  });
});
