"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../../src/rtk/automation/orchestrator.js");
const harness_js_1 = require("./harness.js");
(0, vitest_1.describe)("Scenario B - High failure rate triggers safeguards", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, harness_js_1.resetHarnessState)();
        // Inject failures for 60% of the extractor jobs
        (0, harness_js_1.withFailingExtractors)(0.6);
    });
    (0, vitest_1.it)("fails the burst due to high failure rate, blocks the section, emits governance delta, and guards against new bursts", async () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // Load failure goals (20 goals)
        const goals = (0, harness_js_1.emitRRKGoals)("rrk-goals.failure.json");
        (0, vitest_1.expect)(goals.length).toBe(20);
        await orchestrator.onSectionOpened("0.2");
        // Execute the burst which should encounter 60% failure rate
        const outcome = await orchestrator.runBurst(goals, "0.2");
        // Since rate is 60% (> 50% threshold), failure rate should be 0.6
        (0, vitest_1.expect)(outcome.successCount).toBe(8);
        (0, vitest_1.expect)(outcome.failureCount).toBe(12);
        const state = (0, harness_js_1.snapshotAutomationState)(orchestrator);
        (0, vitest_1.expect)(state.failure_rate).toBe(0.6);
        (0, vitest_1.expect)(state.blocked_sections).toContain("0.2");
        // Check that governance feedback was emitted
        const govEvents = (0, harness_js_1.captureGovernanceEvents)();
        (0, vitest_1.expect)(govEvents.length).toBeGreaterThanOrEqual(1);
        // Assert on the emitted governance feedback reason
        const hasFailureRateAlert = govEvents.some((event) => event.changes.some((change) => change.includes("blocked due to high failure rate: 60%")));
        (0, vitest_1.expect)(hasFailureRateAlert).toBe(true);
        // Verify safeguard: running another burst on a blocked section should be rejected
        await (0, vitest_1.expect)(orchestrator.runBurst(goals.slice(0, 2), "0.2")).rejects.toThrow("Cannot run burst on blocked section: 0.2");
    });
});
//# sourceMappingURL=rtk-hybrid.failure-guard.test.js.map