"use strict";
// File: projects/cic/tests/mee/self-healing-engine.test.ts | Date: 2026-06-04 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const self_healing_engine_js_1 = require("../../src/mee/self-healing/self-healing-engine.js");
(0, vitest_1.describe)("SelfHealingEngine", () => {
    (0, vitest_1.it)("generates a healing plan using mock LLM client", async () => {
        const mockClient = {
            suggestHealing: async (input) => {
                return {
                    summary: "Mock healing plan",
                    tasks: [
                        {
                            title: "Mock fix",
                            description: "Mock fix description",
                            type: "fix",
                        },
                    ],
                };
            },
        };
        const engine = new self_healing_engine_js_1.SelfHealingEngine(mockClient);
        const mockJob = {
            id: "job-1",
            createdAt: "",
            updatedAt: "",
            status: "failed",
            request: "Build target feature",
            proposalIds: [],
        };
        const mockPlan = {
            rootRequest: "Build target feature",
            summary: "Original plan",
            tasks: [],
        };
        const mockFailure = {
            runId: "run-1",
            jobId: "job-1",
            createdAt: "",
            failingProposalIds: ["prop-1"],
            errorMessage: "Build failed",
        };
        const healingPlan = await engine.generateHealingPlan(mockJob, mockPlan, mockFailure);
        (0, vitest_1.expect)(healingPlan.parentJobId).toBe("job-1");
        (0, vitest_1.expect)(healingPlan.summary).toBe("Mock healing plan");
        (0, vitest_1.expect)(healingPlan.suggestedTasks.length).toBe(1);
        (0, vitest_1.expect)(healingPlan.suggestedTasks[0].title).toBe("Mock fix");
    });
});
//# sourceMappingURL=self-healing-engine.test.js.map