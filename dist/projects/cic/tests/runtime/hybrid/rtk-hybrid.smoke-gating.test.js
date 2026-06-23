"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orchestrator_js_1 = require("../../../src/rtk/automation/orchestrator.js");
const harness_js_1 = require("./harness.js");
(0, vitest_1.describe)("Scenario D - Smoke-test gating on section change", () => {
    (0, vitest_1.beforeEach)(() => {
        (0, harness_js_1.resetHarnessState)();
    });
    (0, vitest_1.it)("fails smoke test on section advancement if extractor fails, blocks the section, emits governance feedback, and prevents rollback", async () => {
        const orchestrator = new orchestrator_js_1.RTKOrchestrator();
        // 1. Initial healthy state on section 0.2
        (0, harness_js_1.withHealthyExtractors)();
        await orchestrator.onSectionOpened("0.2");
        const state1 = (0, harness_js_1.snapshotAutomationState)(orchestrator);
        (0, vitest_1.expect)(state1.active_section_id).toBe("0.2");
        (0, vitest_1.expect)(state1.blocked_sections).not.toContain("0.2");
        // 2. Inject failure right before advancing to 0.3 so the smoke test fails
        (0, harness_js_1.withFailingExtractors)(1.0); // 100% failure rate
        // Advance section to 0.3, which triggers the smoke tests
        const advanceOutcome = await orchestrator.onSectionAdvanced("0.3");
        // Assert that the smoke test failed and section 0.3 was rejected
        (0, vitest_1.expect)(advanceOutcome.ok).toBe(false);
        (0, vitest_1.expect)(advanceOutcome.error).toBe("Smoke ingestion job execution failed");
        // Assert that section 0.3 is blocked and active section is NOT 0.3 (no rollback to invalid state, active remains 0.2)
        const state2 = (0, harness_js_1.snapshotAutomationState)(orchestrator);
        (0, vitest_1.expect)(state2.blocked_sections).toContain("0.3");
        // Ensure it remains monotonic and hasn't illegal advanced the active section id to 0.3 in state
        (0, vitest_1.expect)(state2.active_section_id).toBe("0.2");
        // Check that governance feedback was emitted with smoke test failure reason
        const govEvents = (0, harness_js_1.captureGovernanceEvents)();
        (0, vitest_1.expect)(govEvents.length).toBeGreaterThanOrEqual(1);
        const hasSmokeTestFailureAlert = govEvents.some((event) => event.changes.some((change) => change.includes("Section 0.3 blocked: Smoke ingestion job execution failed")));
        (0, vitest_1.expect)(hasSmokeTestFailureAlert).toBe(true);
        // Verify bursts on 0.3 are halted
        const goals = [{ "goal_id": "goal-s1", "type": "ingest_target", "target": "file://photo.jpg", "target_type": "image" }];
        await (0, vitest_1.expect)(orchestrator.runBurst(goals, "0.3")).rejects.toThrow("Cannot run burst on blocked section: 0.3");
    });
});
//# sourceMappingURL=rtk-hybrid.smoke-gating.test.js.map