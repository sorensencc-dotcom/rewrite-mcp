"use strict";
// File: projects/cic/tests/mee/mee-planning.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const planning_engine_js_1 = require("../../src/mee/planning/planning-engine.js");
(0, vitest_1.describe)("PlanningEngine", () => {
    (0, vitest_1.it)("generates tasks from a request", () => {
        const engine = new planning_engine_js_1.PlanningEngine();
        const plan = engine.generatePlan("Add extractor and update validator");
        (0, vitest_1.expect)(plan.tasks.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("orders tasks with dependencies", () => {
        const engine = new planning_engine_js_1.PlanningEngine();
        const plan = engine.generatePlan("Add extractor and update validator");
        const tests = plan.tasks.filter((t) => t.type === "test");
        const featuresAndRefactors = plan.tasks.filter((t) => t.type === "feature" || t.type === "refactor");
        for (const test of tests) {
            (0, vitest_1.expect)(test.dependsOn.length).toBe(featuresAndRefactors.length);
        }
    });
});
//# sourceMappingURL=mee-planning.test.js.map