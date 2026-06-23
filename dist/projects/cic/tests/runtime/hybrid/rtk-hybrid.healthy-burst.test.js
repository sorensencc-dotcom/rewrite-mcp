"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../../src/rtk/automation/orchestrator.js");
const harness_js_1 = require("./harness.js");
// Helper locally or imported
function checkSectionMonotonic(events) {
    const VALID_SECTIONS = ["0.1-A", "0.2", "0.3", "0.4"];
    let lastIndex = -1;
    for (const section of events) {
        const currentIndex = VALID_SECTIONS.indexOf(section);
        if (currentIndex === -1) {
            throw new Error(`Invalid section in transition sequence: ${section}`);
        }
        if (currentIndex < lastIndex) {
            throw new Error(`Section regression detected: transitioned back to ${section}`);
        }
        lastIndex = currentIndex;
    }
}
(0, vitest_1.describe)("Scenario A - Healthy burst, full loop", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, harness_js_1.resetHarnessState)();
        (0, harness_js_1.withHealthyExtractors)();
    });
    (0, vitest_1.it)("processes 10 mixed goals, all jobs complete successfully, advances section monotonically, and emits no governance failures", async () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // Load healthy goals from fixture
        const goals = (0, harness_js_1.emitRRKGoals)("rrk-goals.healthy.json");
        (0, vitest_1.expect)(goals.length).toBe(10);
        // Track mock governance and section events
        const sectionEvents = [];
        // Initialize the orchestrator on section 0.2
        await orchestrator.onSectionOpened("0.2");
        sectionEvents.push("0.2");
        // Execute the burst on section 0.2
        const outcome = await orchestrator.runBurst(goals, "0.2");
        // Assert outcome
        (0, vitest_1.expect)(outcome.successCount).toBe(10);
        (0, vitest_1.expect)(outcome.failureCount).toBe(0);
        // Get current automation state
        const state = (0, harness_js_1.snapshotAutomationState)(orchestrator);
        (0, vitest_1.expect)(state.failure_rate).toBe(0);
        (0, vitest_1.expect)(state.blocked_sections).toEqual([]);
        (0, vitest_1.expect)(state.open_bursts).toEqual([]);
        // Advance to 0.3
        const advanceRes = await orchestrator.onSectionAdvanced("0.3");
        (0, vitest_1.expect)(advanceRes.ok).toBe(true);
        sectionEvents.push("0.3");
        // Verify section monotonic invariant
        (0, vitest_1.expect)(() => checkSectionMonotonic(sectionEvents)).not.toThrow();
        // Assert that no governance feedback was emitted since everything was healthy
        const govEvents = (0, harness_js_1.captureGovernanceEvents)();
        (0, vitest_1.expect)(govEvents.length).toBe(0);
    });
});
//# sourceMappingURL=rtk-hybrid.healthy-burst.test.js.map