import { describe, it, expect } from "vitest";
import { RTKOrchestrator } from "../../src/rtk/automation/orchestrator.js";

describe("RTK Automation Contract Tests", () => {
  it("validates RRK goals, plans bursts, and materializes jobs", () => {
    const orchestrator = new RTKOrchestrator();
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

    expect(burst.burst_id).toBeDefined();
    expect(burst.section_id).toBe("0.2");
    expect(burst.goals).toContain("goal-101");
    expect(burst.goals).toContain("goal-102");
    expect(burst.jobs.length).toBe(2);
    expect(burst.status).toBe("queued");
  });

  it("gates section tracking transitions with smoke tests (healthy case)", async () => {
    const orchestrator = new RTKOrchestrator();
    
    // Healthy section opening
    await orchestrator.onSectionOpened("0.2");
    expect(orchestrator.getStateTracker().getState().active_section_id).toBe("0.2");

    // Healthy smoke test check
    const advanced = await orchestrator.onSectionAdvanced("0.3");
    expect(advanced.ok).toBe(true);
    expect(orchestrator.getStateTracker().getState().active_section_id).toBe("0.3");
  });
});
