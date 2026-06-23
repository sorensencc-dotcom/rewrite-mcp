"use strict";
// File: projects/cic/tests/mee/mee-self-refactor.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const self_refactor_engine_js_1 = require("../../src/mee/self-refactor/self-refactor-engine.js");
(0, vitest_1.describe)("SelfRefactorEngine", () => {
    (0, vitest_1.it)("scans file contents and returns insights", () => {
        const engine = new self_refactor_engine_js_1.SelfRefactorEngine();
        const insights = engine.scan([
            {
                path: "src/test.ts",
                content: "const a = 1; // unused"
            }
        ]);
        (0, vitest_1.expect)(insights.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(insights[0].type).toBe("dead_code");
    });
    (0, vitest_1.it)("generates a plan and proposal from insights", () => {
        const engine = new self_refactor_engine_js_1.SelfRefactorEngine();
        const insights = [
            {
                id: "1",
                file: "src/foo.ts",
                type: "complexity",
                message: "High complexity",
                severity: "high",
            },
            {
                id: "2",
                file: "src/bar.ts",
                type: "unused_import",
                message: "Unused import: 'x'",
                severity: "low"
            }
        ];
        const plan = engine.generatePlan(insights);
        (0, vitest_1.expect)(plan.patches.length).toBe(2);
        (0, vitest_1.expect)(plan.patches[0].path).toBe("src/foo.ts");
        (0, vitest_1.expect)(plan.patches[0].type).toBe("modify");
        (0, vitest_1.expect)(plan.patches[1].path).toBe("src/bar.ts");
        (0, vitest_1.expect)(plan.patches[1].type).toBe("modify");
        (0, vitest_1.expect)(plan.summary).toContain("Generated 2 refactor patches");
        const proposal = engine.toProposal(plan);
        (0, vitest_1.expect)(proposal.id).toContain("refactor-");
        (0, vitest_1.expect)(proposal.title).toBe("CIC Self-Refactor Plan");
        (0, vitest_1.expect)(proposal.status).toBe("pending");
        (0, vitest_1.expect)(proposal.refactorPlan).toEqual(plan);
    });
});
//# sourceMappingURL=mee-self-refactor.test.js.map