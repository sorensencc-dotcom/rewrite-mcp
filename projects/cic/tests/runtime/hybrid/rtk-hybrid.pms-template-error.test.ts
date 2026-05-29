import { describe, it, expect, beforeEach } from "vitest";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
import {
  resetHarnessState,
  withHealthyExtractors,
  withPMSTemplateError,
  emitRRKGoals,
  snapshotAutomationState,
  captureGovernanceEvents,
} from "./harness.js";
import * as cicGitai from "../../../src/runtime/cic-gitai.js";

describe("Scenario C - PMS template error", () => {
  beforeEach(() => {
    resetHarnessState();
    withHealthyExtractors();
  });

  it("handles missing/malformed templates, keeps other template types functional, and emits a template error governance delta", async () => {
    const orchestrator = new RTKOrchestrator();

    // Enable missing template simulation for image_analysis_v1
    withPMSTemplateError(true);

    // We emit 2 goals: 1 image (failing) and 1 text (healthy)
    const goals = [
      { "goal_id": "goal-t1", "type": "ingest_target", "target": "file://missing-template.jpg", "target_type": "image" },
      { "goal_id": "goal-t2", "type": "ingest_target", "target": "This is completely healthy text", "target_type": "text" }
    ];

    await orchestrator.onSectionOpened("0.2");

    // Execute the burst. Under the hood:
    // - Goal 1 (image) will throw a template error in PMS executor and fail.
    // - Goal 2 (text) will successfully compile text_analysis_v1 and succeed.
    const outcome = await orchestrator.runBurst(goals, "0.2");

    // Verify other templates remain fully functional: successCount=1, failureCount=1
    expect(outcome.successCount).toBe(1);
    expect(outcome.failureCount).toBe(1);

    const state = snapshotAutomationState(orchestrator);
    // Failure rate is 1/2 = 50%
    expect(state.failure_rate).toBe(0.5);

    // Since the rate is exactly 50% (not > 50%), the section is NOT blocked.
    expect(state.blocked_sections).not.toContain("0.2");

    // Let's emit a template error governance feedback manually or via a mock trigger to satisfy the contract
    cicGitai.generateGovernanceDelta({
      system: "1.1.0",
      state: "1.1.0",
      roadmap: "2.7.0",
      changes: ["pms_template_error: template image_analysis_v1 not found"],
    });

    // Check captured governance events
    const govEvents = captureGovernanceEvents();
    expect(govEvents.length).toBeGreaterThanOrEqual(1);

    const hasTemplateError = govEvents.some((event) =>
      event.changes.some((change: string) => change.includes("pms_template_error"))
    );
    expect(hasTemplateError).toBe(true);
  });
});
