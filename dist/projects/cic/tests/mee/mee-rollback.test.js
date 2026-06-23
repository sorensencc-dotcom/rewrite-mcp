"use strict";
// File: projects/cic/tests/mee/mee-rollback.test.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rollback_engine_js_1 = require("../../src/mee/safety/rollback-engine.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
(0, vitest_1.describe)("MeeRollbackEngine", () => {
    const testFile1 = "projects/cic/tests/mee/temp-rollback-test-1.txt";
    const testFile2 = "projects/cic/tests/mee/temp-rollback-test-2.txt";
    (0, vitest_1.beforeEach)(() => {
        // Setup initial state
        const workspaceRoot = process.cwd();
        const full1 = node_path_1.default.resolve(workspaceRoot, testFile1);
        const full2 = node_path_1.default.resolve(workspaceRoot, testFile2);
        if (node_fs_1.default.existsSync(full1))
            node_fs_1.default.unlinkSync(full1);
        if (node_fs_1.default.existsSync(full2))
            node_fs_1.default.unlinkSync(full2);
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(full1), { recursive: true });
        node_fs_1.default.writeFileSync(full1, "original content 1", "utf8");
    });
    (0, vitest_1.afterEach)(() => {
        // Cleanup
        const workspaceRoot = process.cwd();
        const full1 = node_path_1.default.resolve(workspaceRoot, testFile1);
        const full2 = node_path_1.default.resolve(workspaceRoot, testFile2);
        if (node_fs_1.default.existsSync(full1))
            node_fs_1.default.unlinkSync(full1);
        if (node_fs_1.default.existsSync(full2))
            node_fs_1.default.unlinkSync(full2);
    });
    (0, vitest_1.it)("snapshots file targets correctly (existing content vs new file)", () => {
        const engine = new rollback_engine_js_1.MeeRollbackEngine();
        const patches = [
            { path: testFile1, type: "modify", content: "new edit" },
            { path: testFile2, type: "create", content: "new file" }
        ];
        const backupMap = engine.snapshot(patches);
        (0, vitest_1.expect)(backupMap[testFile1]).toBe("original content 1");
        (0, vitest_1.expect)(backupMap[testFile2]).toBeNull();
    });
    (0, vitest_1.it)("restores original files and deletes created files on rollback", () => {
        const engine = new rollback_engine_js_1.MeeRollbackEngine();
        const patches = [
            { path: testFile1, type: "modify", content: "new edit 1" },
            { path: testFile2, type: "create", content: "new file 2" }
        ];
        // 1. Snapshot
        const backupMap = engine.snapshot(patches);
        // 2. Simulate applying patches
        const workspaceRoot = process.cwd();
        const full1 = node_path_1.default.resolve(workspaceRoot, testFile1);
        const full2 = node_path_1.default.resolve(workspaceRoot, testFile2);
        node_fs_1.default.writeFileSync(full1, "new edit 1", "utf8");
        node_fs_1.default.writeFileSync(full2, "new file 2", "utf8");
        (0, vitest_1.expect)(node_fs_1.default.readFileSync(full1, "utf8")).toBe("new edit 1");
        (0, vitest_1.expect)(node_fs_1.default.existsSync(full2)).toBe(true);
        // 3. Rollback
        engine.restore(backupMap);
        // 4. Assert restoration
        (0, vitest_1.expect)(node_fs_1.default.readFileSync(full1, "utf8")).toBe("original content 1");
        (0, vitest_1.expect)(node_fs_1.default.existsSync(full2)).toBe(false);
    });
});
//# sourceMappingURL=mee-rollback.test.js.map