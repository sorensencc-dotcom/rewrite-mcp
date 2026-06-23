"use strict";
// File: projects/cic/tests/mee/llm-planning-engine.test.ts | Date: 2026-06-04 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const llm_planning_engine_js_1 = require("../../src/mee/planning/llm-planning-engine.js");
(0, vitest_1.describe)("LLMPlanningEngine", () => {
    (0, vitest_1.it)("generates a plan using mock LLM client", async () => {
        const mockClient = {
            generatePlan: async (input) => {
                return {
                    rootRequest: input.request,
                    summary: "Mock plan",
                    tasks: [
                        {
                            id: "task-1",
                            title: "Mock task",
                            description: "Mock task description",
                            type: "feature",
                            dependsOn: [],
                        },
                    ],
                };
            },
        };
        const engine = new llm_planning_engine_js_1.LLMPlanningEngine(mockClient);
        const plan = await engine.generatePlan("Build mock feature");
        (0, vitest_1.expect)(plan.rootRequest).toBe("Build mock feature");
        (0, vitest_1.expect)(plan.summary).toBe("Mock plan");
        (0, vitest_1.expect)(plan.tasks.length).toBe(1);
        (0, vitest_1.expect)(plan.tasks[0].title).toBe("Mock task");
    });
});
//# sourceMappingURL=llm-planning-engine.test.js.map