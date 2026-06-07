import { describe, it, expect, vi } from "vitest";
import { RTKOrchestrator } from "../../src/rtk/automation/orchestrator.js";
import * as rtkCic from "../../src/runtime/rtk-cic.js";

vi.mock("../../src/runtime/rtk-cic.js");

describe("RTK Automation Hybrid Tests (Mode B)", () => {
  it("runs a healthy burst successfully", async () => {
    vi.spyOn(rtkCic, "submitIngestionJob").mockResolvedValue({ ok: true });

    const orchestrator = new RTKOrchestrator();
    const goals = [
      {
        goal_id: "goal-1",
        type: "ingest_target",
        target: "file://photo.jpg",
        target_type: "image",
      },
    ];

    const outcome = await orchestrator.runBurst(goals, "0.2");
    expect(outcome.successCount).toBe(1);
    expect(outcome.failureCount).toBe(0);
    expect(orchestrator.getStateTracker().getState().failure_rate).toBe(0);
    expect(orchestrator.getStateTracker().getState().blocked_sections).not.toContain("0.2");
  });

  it("blocks section when burst failure rate exceeds threshold", async () => {
    vi.spyOn(rtkCic, "submitIngestionJob").mockResolvedValue({ ok: false });

    const orchestrator = new RTKOrchestrator();
    const goals = [
      {
        goal_id: "goal-2",
        type: "ingest_target",
        target: "file://photo.jpg",
        target_type: "image",
      },
    ];

    const outcome = await orchestrator.runBurst(goals, "0.2");
    expect(outcome.successCount).toBe(0);
    expect(outcome.failureCount).toBe(1);
    expect(orchestrator.getStateTracker().getState().failure_rate).toBe(1);
    expect(orchestrator.getStateTracker().getState().blocked_sections).toContain("0.2");
  });
});
