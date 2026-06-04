// File: projects/cic/tests/mee/mee-memory-store.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { InMemoryMeeMemoryStore, FileMeeMemoryStore } from "../../src/mee/mee-memory-store.js";
import { MeeMemoryItem } from "../../src/mee/mee-schema.js";

describe("MeeMemoryStore", () => {
  describe("InMemoryMeeMemoryStore", () => {
    it("should add, get, and query memory items", () => {
      const store = new InMemoryMeeMemoryStore();
      const item: MeeMemoryItem = {
        id: "mem-1",
        createdAt: new Date().toISOString(),
        scope: "job",
        jobId: "job-123",
        tags: ["success", "build"],
        summary: "Build succeeded",
        details: "Clean compile completed in 5s",
      };

      store.add(item);

      expect(store.get("mem-1")).toEqual(item);
      expect(store.get("mem-2")).toBeUndefined();

      expect(store.queryByTags(["success"])).toEqual([item]);
      expect(store.queryByTags(["failure"])).toEqual([]);
      expect(store.queryByJob("job-123")).toEqual([item]);
      expect(store.queryByJob("job-other")).toEqual([]);
    });
  });

  describe("FileMeeMemoryStore", () => {
    const testDir = path.resolve(process.cwd(), "projects/cic/data/test-memory");

    beforeEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it("should persist items to file and support queries", () => {
      const store = new FileMeeMemoryStore(testDir);
      const item: MeeMemoryItem = {
        id: "mem-file-1",
        createdAt: new Date().toISOString(),
        scope: "run",
        jobId: "job-abc",
        runId: "run-xyz",
        tags: ["failure", "compile_error"],
        summary: "Compile error in main.ts",
        details: "Missing semicolon on line 42",
      };

      store.add(item);

      // Verify file is created and contains the serialized data
      const filePath = store.memoryFile();
      expect(fs.existsSync(filePath)).toBe(true);

      // Reload store to verify persistence
      const store2 = new FileMeeMemoryStore(testDir);
      expect(store2.get("mem-file-1")).toEqual(item);

      expect(store2.queryByTags(["compile_error"])).toEqual([item]);
      expect(store2.queryByJob("job-abc")).toEqual([item]);
    });
  });
});
