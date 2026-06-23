"use strict";
// File: projects/cic/tests/mee/mee-sandbox.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sandbox_engine_js_1 = require("../../src/mee/safety/sandbox-engine.js");
(0, vitest_1.describe)("MeeSandboxEngine", () => {
    (0, vitest_1.it)("executes mock sandbox verification and returns mock results", async () => {
        const engine = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: true });
        const patches = [
            { path: "projects/cic/src/mee/mee-schema.ts", type: "modify", content: "// mock edit" }
        ];
        const result = await engine.validate(patches);
        (0, vitest_1.expect)(result.passed).toBe(true);
        (0, vitest_1.expect)(result.compilePassed).toBe(true);
        (0, vitest_1.expect)(result.testsPassed).toBe(true);
        (0, vitest_1.expect)(result.output).toContain("Mock sandbox validation output.");
    });
    (0, vitest_1.it)("handles mock sandbox failures", async () => {
        const engine = new sandbox_engine_js_1.MeeSandboxEngine({ mockExec: true, mockResult: false });
        const patches = [];
        const result = await engine.validate(patches);
        (0, vitest_1.expect)(result.passed).toBe(false);
        (0, vitest_1.expect)(result.compilePassed).toBe(false);
        (0, vitest_1.expect)(result.testsPassed).toBe(false);
    });
});
//# sourceMappingURL=mee-sandbox.test.js.map