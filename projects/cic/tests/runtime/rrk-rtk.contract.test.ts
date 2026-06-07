import { describe, it, expect } from "vitest";
import { validateRRKGoal, materializeGoal } from "../../src/runtime/rrk-rtk.js";

describe("RRK → RTK Contract", () => {
  it("accepts a valid research_goal", () => {
    const goal = {
      type: "research_goal",
      target: "archive://folder/A",
      metadata: { priority: "high" }
    };

    expect(validateRRKGoal(goal)).toEqual({ ok: true });
  });

  it("rejects malformed goals", () => {
    const goal = { type: "research_goal" }; // missing target
    expect(validateRRKGoal(goal).ok).toBe(false);
  });

  it("rejects unknown goal types", () => {
    const goal = { type: "unknown_goal", target: "x" };
    expect(validateRRKGoal(goal).ok).toBe(false);
  });

  it("materializes valid goals into ingestion jobs", () => {
    const goal = {
      type: "ingest_target",
      target: "file://A.jpg"
    };

    const job = materializeGoal(goal);
    expect(job).toMatchObject({
      type: "image",
      source: "file://A.jpg"
    });
  });
});
