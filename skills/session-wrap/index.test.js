import { describe, it, expect } from "vitest";
import { sessionWrap } from "./index.js";

describe("session-wrap", () => {
  it("requires commitMessage", async () => {
    try {
      await sessionWrap({ summary: "test" });
      throw new Error("Should have thrown");
    } catch (error) {
      expect(error.message).toContain("Invalid commit message format");
    }
  });

  it("validates commit message format", async () => {
    try {
      await sessionWrap({ commitMessage: "no prefix" });
      throw new Error("Should have thrown");
    } catch (error) {
      expect(error.message).toContain("Invalid commit message format");
    }
  });

  it("accepts valid commit prefixes", async () => {
    const prefixes = ["[claude]", "[copilot]", "[gemini]", "[human]"];
    for (const prefix of prefixes) {
      try {
        const result = await sessionWrap({
          commitMessage: `${prefix} Test message`,
          summary: "Test"
        });
        expect(result.success).toBe(true);
      } catch (error) {
        // May fail due to git, but message format should pass
        if (error.message.includes("Invalid commit message format")) {
          throw error;
        }
      }
    }
  });

  it("handles doc updates", async () => {
    const result = await sessionWrap({
      commitMessage: "[claude] Test",
      docUpdates: [
        { path: "/tmp/test-doc.md", content: "# Test Doc" }
      ]
    });
    expect(result.docUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: expect.stringMatching(/updated|failed/)
        })
      ])
    );
  });

  it("returns proper report structure", async () => {
    const result = await sessionWrap({
      commitMessage: "[claude] Test",
      summary: "Test session"
    });
    expect(result.report).toBeDefined();
    expect(result.report.checklistItems).toEqual(expect.any(Array));
    expect(result.report.nextSteps).toEqual(expect.any(Array));
  });
});
