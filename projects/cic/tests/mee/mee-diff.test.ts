// File: projects/cic/tests/mee/mee-diff.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { MeeDiffEngine } from "../../src/mee/mee-diff-engine.js";

describe("MeeDiffEngine", () => {
  it("generates diff for new file", () => {
    const diff = new MeeDiffEngine().generateDiff({
      path: "docs/test.md",
      type: "create",
      content: "hello\nworld",
    });

    expect(diff.oldContent).toBeNull();
    expect(diff.newContent).toContain("hello");
    expect(diff.chunks.some((c) => c.type === "add")).toBe(true);
  });

  it("generates diff for modified file", () => {
    const engine = new MeeDiffEngine();

    const diff = engine.generateDiff({
      path: "package.json",
      type: "modify",
      content: "modified content",
    });

    expect(diff.chunks.length).toBeGreaterThan(0);
  });
});
