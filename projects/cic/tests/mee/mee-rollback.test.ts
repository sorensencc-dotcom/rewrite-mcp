// File: projects/cic/tests/mee/mee-rollback.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MeeRollbackEngine } from "../../src/mee/safety/rollback-engine.js";
import { PhasePatch } from "../../src/mee/mee-schema.js";
import fs from "node:fs";
import path from "node:path";

describe("MeeRollbackEngine", () => {
  const testFile1 = "projects/cic/tests/mee/temp-rollback-test-1.txt";
  const testFile2 = "projects/cic/tests/mee/temp-rollback-test-2.txt";

  beforeEach(() => {
    // Setup initial state
    const workspaceRoot = process.cwd();
    const full1 = path.resolve(workspaceRoot, testFile1);
    const full2 = path.resolve(workspaceRoot, testFile2);

    if (fs.existsSync(full1)) fs.unlinkSync(full1);
    if (fs.existsSync(full2)) fs.unlinkSync(full2);

    fs.mkdirSync(path.dirname(full1), { recursive: true });
    fs.writeFileSync(full1, "original content 1", "utf8");
  });

  afterEach(() => {
    // Cleanup
    const workspaceRoot = process.cwd();
    const full1 = path.resolve(workspaceRoot, testFile1);
    const full2 = path.resolve(workspaceRoot, testFile2);

    if (fs.existsSync(full1)) fs.unlinkSync(full1);
    if (fs.existsSync(full2)) fs.unlinkSync(full2);
  });

  it("snapshots file targets correctly (existing content vs new file)", () => {
    const engine = new MeeRollbackEngine();
    const patches: PhasePatch[] = [
      { path: testFile1, type: "modify", content: "new edit" },
      { path: testFile2, type: "create", content: "new file" }
    ];

    const backupMap = engine.snapshot(patches);
    expect(backupMap[testFile1]).toBe("original content 1");
    expect(backupMap[testFile2]).toBeNull();
  });

  it("restores original files and deletes created files on rollback", () => {
    const engine = new MeeRollbackEngine();
    const patches: PhasePatch[] = [
      { path: testFile1, type: "modify", content: "new edit 1" },
      { path: testFile2, type: "create", content: "new file 2" }
    ];

    // 1. Snapshot
    const backupMap = engine.snapshot(patches);

    // 2. Simulate applying patches
    const workspaceRoot = process.cwd();
    const full1 = path.resolve(workspaceRoot, testFile1);
    const full2 = path.resolve(workspaceRoot, testFile2);

    fs.writeFileSync(full1, "new edit 1", "utf8");
    fs.writeFileSync(full2, "new file 2", "utf8");

    expect(fs.readFileSync(full1, "utf8")).toBe("new edit 1");
    expect(fs.existsSync(full2)).toBe(true);

    // 3. Rollback
    engine.restore(backupMap);

    // 4. Assert restoration
    expect(fs.readFileSync(full1, "utf8")).toBe("original content 1");
    expect(fs.existsSync(full2)).toBe(false);
  });
});
