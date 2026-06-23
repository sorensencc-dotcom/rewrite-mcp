"use strict";
// File: projects/cic/tests/mee/mee-diff.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mee_diff_engine_js_1 = require("../../src/mee/mee-diff-engine.js");
(0, vitest_1.describe)("MeeDiffEngine", () => {
    (0, vitest_1.it)("generates diff for new file", () => {
        const diff = new mee_diff_engine_js_1.MeeDiffEngine().generateDiff({
            path: "docs/test.md",
            type: "create",
            content: "hello\nworld",
        });
        (0, vitest_1.expect)(diff.oldContent).toBeNull();
        (0, vitest_1.expect)(diff.newContent).toContain("hello");
        (0, vitest_1.expect)(diff.chunks.some((c) => c.type === "add")).toBe(true);
    });
    (0, vitest_1.it)("generates diff for modified file", () => {
        const engine = new mee_diff_engine_js_1.MeeDiffEngine();
        const diff = engine.generateDiff({
            path: "package.json",
            type: "modify",
            content: "modified content",
        });
        (0, vitest_1.expect)(diff.chunks.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=mee-diff.test.js.map