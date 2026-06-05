import { describe, it, expect } from "vitest";
import { summarizeSection } from "./index.js";

describe("cic-section-summarizer", () => {
  it("requires sectionId", () => {
    expect(() => summarizeSection({})).toThrow("sectionId is required");
  });

  it("summarizes a section with files", () => {
    const result = summarizeSection({
      sectionId: "phase-44.0",
      files: ["file1.ts", "file2.ts"]
    });
    expect(result.sectionId).toBe("phase-44.0");
    expect(result.filesReviewed).toBe(2);
    expect(result.nextSteps).toEqual(expect.any(Array));
  });

  it("includes missing tests in output", () => {
    const result = summarizeSection({
      sectionId: "phase-44.0",
      files: ["implementation.ts"]
    });
    expect(result.missingTests).toContain("implementation.ts");
  });
});
