"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../src/rtk/automation/orchestrator.js");
(0, vitest_1.describe)("RTK Automation Contract Tests", () => {
    (0, vitest_1.it)("validates RRK goals, plans bursts, and materializes jobs", () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        const goals = [
            {
                goal_id: "goal-101",
                type: "ingest_target",
                target: "file://photo.jpg",
                target_type: "image",
            },
            {
                goal_id: "goal-102",
                type: "ingest_target",
                target: "file://doc.txt",
                target_type: "text",
            },
        ];
        const burst = orchestrator.getPlanner().planBurst(goals, "0.2");
        (0, vitest_1.expect)(burst.burst_id).toBeDefined();
        (0, vitest_1.expect)(burst.section_id).toBe("0.2");
        (0, vitest_1.expect)(burst.goals).toContain("goal-101");
        (0, vitest_1.expect)(burst.goals).toContain("goal-102");
        (0, vitest_1.expect)(burst.jobs.length).toBe(2);
        (0, vitest_1.expect)(burst.status).toBe("queued");
    });
    (0, vitest_1.it)("gates section tracking transitions with smoke tests (healthy case)", async () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // Healthy section opening
        await orchestrator.onSectionOpened("0.2");
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().active_section_id).toBe("0.2");
        // Healthy smoke test check
        const advanced = await orchestrator.onSectionAdvanced("0.3");
        (0, vitest_1.expect)(advanced.ok).toBe(true);
        (0, vitest_1.expect)(orchestrator.getStateTracker().getState().active_section_id).toBe("0.3");
    });
});
//# sourceMappingURL=rtk-automation.contract.test.js.map