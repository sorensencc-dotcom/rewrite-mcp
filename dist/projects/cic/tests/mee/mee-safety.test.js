"use strict";
// File: projects/cic/tests/mee/mee-safety.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const safety_engine_js_1 = require("../../src/mee/safety/safety-engine.js");
(0, vitest_1.describe)("MeeSafetyEngine", () => {
    (0, vitest_1.it)("classifies simple file edits as low risk and passes", () => {
        const engine = new safety_engine_js_1.MeeSafetyEngine();
        const patches = [
            { path: "projects/cic/src/mee/mee-trigger.ts", type: "modify", content: "console.log('test');" }
        ];
        const report = engine.analyze(patches);
        (0, vitest_1.expect)(report.passed).toBe(true);
        (0, vitest_1.expect)(report.riskLevel).toBe("low");
        (0, vitest_1.expect)(report.issues.length).toBe(0);
    });
    (0, vitest_1.it)("classifies multi-file modifications as medium risk and passes", () => {
        const engine = new safety_engine_js_1.MeeSafetyEngine();
        const patches = [
            { path: "projects/cic/src/mee/a.ts", type: "modify", content: "a" },
            { path: "projects/cic/src/mee/b.ts", type: "modify", content: "b" },
            { path: "projects/cic/src/mee/c.ts", type: "modify", content: "c" },
            { path: "projects/cic/src/mee/d.ts", type: "modify", content: "d" }
        ];
        const report = engine.analyze(patches);
        (0, vitest_1.expect)(report.passed).toBe(true);
        (0, vitest_1.expect)(report.riskLevel).toBe("medium");
        (0, vitest_1.expect)(report.issues.length).toBe(1);
        (0, vitest_1.expect)(report.issues[0]).toContain("Proposal modifies multiple files");
    });
    (0, vitest_1.it)("classifies sensitive file edits (package.json) as high risk and blocks", () => {
        const engine = new safety_engine_js_1.MeeSafetyEngine();
        const patches = [
            { path: "projects/cic/package.json", type: "modify", content: "{}" }
        ];
        const report = engine.analyze(patches);
        (0, vitest_1.expect)(report.passed).toBe(false);
        (0, vitest_1.expect)(report.riskLevel).toBe("high");
        (0, vitest_1.expect)(report.issues.length).toBe(1);
        (0, vitest_1.expect)(report.issues[0]).toContain("Modification of sensitive configuration file detected");
    });
    (0, vitest_1.it)("classifies forbidden runtime patterns (eval) as critical risk and blocks", () => {
        const engine = new safety_engine_js_1.MeeSafetyEngine();
        const patches = [
            { path: "projects/cic/src/mee/exec.ts", type: "modify", content: "const a = eval('1+1');" }
        ];
        const report = engine.analyze(patches);
        (0, vitest_1.expect)(report.passed).toBe(false);
        (0, vitest_1.expect)(report.riskLevel).toBe("critical");
        (0, vitest_1.expect)(report.issues.length).toBe(1);
        (0, vitest_1.expect)(report.issues[0]).toContain("Forbidden pattern \"eval()\" detected");
    });
});
//# sourceMappingURL=mee-safety.test.js.map