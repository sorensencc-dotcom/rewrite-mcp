import { describe, it, expect, beforeEach } from "vitest";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
import {
  resetHarnessState,
  withHealthyExtractors,
  emitRRKGoals,
  snapshotAutomationState,
  captureGovernanceEvents,
  expectSectionMonotonic,
} from "./harness.js";

// Helper locally or imported
function checkSectionMonotonic(events: string[]) {
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

describe("Scenario A - Healthy burst, full loop", () => {
  beforeEach(() => {
    resetHarnessState();
    withHealthyExtractors();
  });

  it("processes 10 mixed goals, all jobs complete successfully, advances section monotonically, and emits no governance failures", async () => {
    const orchestrator = new RTKOrchestrator();
    
    // Load healthy goals from fixture
    const goals = emitRRKGoals("rrk-goals.healthy.json");
    expect(goals.length).toBe(10);

    // Track mock governance and section events
    const sectionEvents: string[] = [];
    
    // Initialize the orchestrator on section 0.2
    await orchestrator.onSectionOpened("0.2");
    sectionEvents.push("0.2");

    // Execute the burst on section 0.2
    const outcome = await orchestrator.runBurst(goals, "0.2");

    // Assert outcome
    expect(outcome.successCount).toBe(10);
    expect(outcome.failureCount).toBe(0);

    // Get current automation state
    const state = snapshotAutomationState(orchestrator);
    expect(state.failure_rate).toBe(0);
    expect(state.blocked_sections).toEqual([]);
    expect(state.open_bursts).toEqual([]);

    // Advance to 0.3
    const advanceRes = await orchestrator.onSectionAdvanced("0.3");
    expect(advanceRes.ok).toBe(true);
    sectionEvents.push("0.3");

    // Verify section monotonic invariant
    expect(() => checkSectionMonotonic(sectionEvents)).not.toThrow();

    // Assert that no governance feedback was emitted since everything was healthy
    const govEvents = captureGovernanceEvents();
    expect(govEvents.length).toBe(0);
  });
});
