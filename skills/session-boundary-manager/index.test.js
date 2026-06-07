import { describe, it, expect } from "vitest";
import { manageSessionBoundary } from "./index.js";

describe("session-boundary-manager", () => {
  it("requires transcript array", () => {
    expect(() => manageSessionBoundary({})).toThrow("transcript is required");
  });

  it("detects session overflow", () => {
    const bigTranscript = Array(60).fill({
      content: "x".repeat(2000),
      tokens: 2000
    });
    const result = manageSessionBoundary({ transcript: bigTranscript });
    expect(result.isOverflowing).toBe(true);
    expect(result.suggestedAction).toBe("summarize_and_split");
  });

  it("tracks message count and tokens", () => {
    const result = manageSessionBoundary({
      transcript: [
        { content: "hello", tokens: 10 },
        { content: "world", tokens: 15 }
      ]
    });
    expect(result.messageCount).toBe(2);
    expect(result.estimatedTokens).toBe(25);
  });

  it("recommends continuation for healthy sessions", () => {
    const result = manageSessionBoundary({
      transcript: [
        { content: "task description", tokens: 100 },
        { content: "progress update", tokens: 100 }
      ]
    });
    expect(result.suggestedAction).toBe("continue");
  });
});
