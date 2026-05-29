import { describe, it, expect } from "vitest";
import { convertGovernanceFeedback } from "../../src/runtime/gitai-rrk.js";

describe("git-ai → RRK Contract", () => {
  it("converts governance feedback into research goals", () => {
    const feedback = {
      type: "gap_detected",
      location: "SYSTEM.md",
      description: "Extractor chain undocumented"
    };

    const goal = convertGovernanceFeedback(feedback);

    expect(goal).toMatchObject({
      type: "research_goal",
      target: "SYSTEM.md"
    });
  });

  it("rejects malformed governance feedback", () => {
    const feedback = { type: "gap_detected" }; // missing fields
    expect(() => convertGovernanceFeedback(feedback)).toThrow();
  });
});
