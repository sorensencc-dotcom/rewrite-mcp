import { describe, it, expect, beforeEach } from "vitest";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
import {
  resetHarnessState,
  withFailingExtractors,
  emitRRKGoals,
  snapshotAutomationState,
  captureGovernanceEvents,
} from "./harness.js";

describe("Scenario B - High failure rate triggers safeguards", () => {
  beforeEach(() => {
    resetHarnessState();
    // Inject failures for 60% of the extractor jobs
    withFailingExtractors(0.6);
  });

  it("fails the burst due to high failure rate, blocks the section, emits governance delta, and guards against new bursts", async () => {
    const orchestrator = new RTKOrchestrator();
    
    // Load failure goals (20 goals)
    const goals = emitRRKGoals("rrk-goals.failure.json");
    expect(goals.length).toBe(20);

    await orchestrator.onSectionOpened("0.2");

    // Execute the burst which should encounter 60% failure rate
    const outcome = await orchestrator.runBurst(goals, "0.2");

    // Since rate is 60% (> 50% threshold), failure rate should be 0.6
    expect(outcome.successCount).toBe(8);
    expect(outcome.failureCount).toBe(12);

    const state = snapshotAutomationState(orchestrator);
    expect(state.failure_rate).toBe(0.6);
    expect(state.blocked_sections).toContain("0.2");

    // Check that governance feedback was emitted
    const govEvents = captureGovernanceEvents();
    expect(govEvents.length).toBeGreaterThanOrEqual(1);
    
    // Assert on the emitted governance feedback reason
    const hasFailureRateAlert = govEvents.some((event) =>
      event.changes.some((change: string) => change.includes("blocked due to high failure rate: 60%"))
    );
    expect(hasFailureRateAlert).toBe(true);

    // Verify safeguard: running another burst on a blocked section should be rejected
    await expect(orchestrator.runBurst(goals.slice(0, 2), "0.2")).rejects.toThrow(
      "Cannot run burst on blocked section: 0.2"
    );
  });
});
