"use strict";
// File: projects/cic/tests/mee/mee-memory-store.test.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const mee_memory_store_js_1 = require("../../src/mee/mee-memory-store.js");
(0, vitest_1.describe)("MeeMemoryStore", () => {
    (0, vitest_1.describe)("InMemoryMeeMemoryStore", () => {
        (0, vitest_1.it)("should add, get, and query memory items", () => {
            const store = new mee_memory_store_js_1.InMemoryMeeMemoryStore();
            const item = {
                id: "mem-1",
                createdAt: new Date().toISOString(),
                scope: "job",
                jobId: "job-123",
                tags: ["success", "build"],
                summary: "Build succeeded",
                details: "Clean compile completed in 5s",
            };
            store.add(item);
            (0, vitest_1.expect)(store.get("mem-1")).toEqual(item);
            (0, vitest_1.expect)(store.get("mem-2")).toBeUndefined();
            (0, vitest_1.expect)(store.queryByTags(["success"])).toEqual([item]);
            (0, vitest_1.expect)(store.queryByTags(["failure"])).toEqual([]);
            (0, vitest_1.expect)(store.queryByJob("job-123")).toEqual([item]);
            (0, vitest_1.expect)(store.queryByJob("job-other")).toEqual([]);
        });
    });
    (0, vitest_1.describe)("FileMeeMemoryStore", () => {
        const testDir = node_path_1.default.resolve(process.cwd(), "projects/cic/data/test-memory");
        (0, vitest_1.beforeEach)(() => {
            if (node_fs_1.default.existsSync(testDir)) {
                node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
            }
        });
        (0, vitest_1.afterEach)(() => {
            if (node_fs_1.default.existsSync(testDir)) {
                node_fs_1.default.rmSync(testDir, { recursive: true, force: true });
            }
        });
        (0, vitest_1.it)("should persist items to file and support queries", () => {
            const store = new mee_memory_store_js_1.FileMeeMemoryStore(testDir);
            const item = {
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
            (0, vitest_1.expect)(node_fs_1.default.existsSync(filePath)).toBe(true);
            // Reload store to verify persistence
            const store2 = new mee_memory_store_js_1.FileMeeMemoryStore(testDir);
            (0, vitest_1.expect)(store2.get("mem-file-1")).toEqual(item);
            (0, vitest_1.expect)(store2.queryByTags(["compile_error"])).toEqual([item]);
            (0, vitest_1.expect)(store2.queryByJob("job-abc")).toEqual([item]);
        });
    });
});
//# sourceMappingURL=mee-memory-store.test.js.map