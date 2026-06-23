"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../../src/rtk/automation/orchestrator.js");
const harness_js_1 = require("./harness.js");
(0, vitest_1.describe)("Scenario E - Observability shape", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, harness_js_1.resetHarnessState)();
    });
    (0, vitest_1.it)("captures structured log entries for key lifecycle events and outputs correct metrics snapshot", async () => {
        // Spy on console.log and console.error
        const logSpy = vitest_1.vi.spyOn(console, "log").mockImplementation(() => { });
        const errorSpy = vitest_1.vi.spyOn(console, "error").mockImplementation(() => { });
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // 1. Run a healthy burst
        (0, harness_js_1.withHealthyExtractors)();
        await orchestrator.onSectionOpened("0.2");
        const healthyGoals = (0, harness_js_1.emitRRKGoals)("rrk-goals.healthy.json").slice(0, 2); // 2 healthy goals
        await orchestrator.runBurst(healthyGoals, "0.2");
        // 2. Advance section to 0.3 (triggers smoke test)
        await orchestrator.onSectionAdvanced("0.3");
        // 3. Run a failing burst to trigger block and failure rate metrics
        (0, harness_js_1.withFailingExtractors)(1.0); // 100% failure rate
        const failingGoals = (0, harness_js_1.emitRRKGoals)("rrk-goals.healthy.json").slice(0, 2);
        await orchestrator.runBurst(failingGoals, "0.3");
        // 4. Assert structured log content
        const loggedMessages = logSpy.mock.calls.map((call) => call[0]).join("\n");
        // Validate burst creation/completion log traces
        (0, vitest_1.expect)(loggedMessages).toContain("[RTK Orchestrator] Section opened");
        // Validate smoke test log traces
        (0, vitest_1.expect)(loggedMessages).toContain("[RTK Orchestrator] Running smoke tests");
        // 5. Assert metrics snapshot
        const metrics = (0, harness_js_1.getMetricsSnapshot)(orchestrator);
        (0, vitest_1.expect)(metrics).toHaveProperty("rtk_bursts_active");
        (0, vitest_1.expect)(metrics).toHaveProperty("rtk_burst_failure_rate");
        (0, vitest_1.expect)(metrics).toHaveProperty("rtk_jobs_in_flight");
        (0, vitest_1.expect)(metrics).toHaveProperty("rtk_sections_blocked");
        // Detailed metrics assertions
        (0, vitest_1.expect)(metrics.rtk_bursts_active).toBe(0); // completed bursts are cleaned up from open_bursts
        (0, vitest_1.expect)(metrics.rtk_burst_failure_rate).toBe(1.0); // the last burst failed completely (100% failure rate)
        (0, vitest_1.expect)(metrics.rtk_jobs_in_flight).toBe(0);
        (0, vitest_1.expect)(metrics.rtk_sections_blocked).toBe(1); // section 0.3 should be blocked now due to the 100% failure rate
        // Restore original console methods
        logSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
//# sourceMappingURL=rtk-hybrid.observability.test.js.map