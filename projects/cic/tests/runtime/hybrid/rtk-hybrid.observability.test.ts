import { describe, it, expect, beforeEach, vi } from "vitest";
import { RTKOrchestrator } from "../../../src/rtk/automation/orchestrator.js";
import {
  resetHarnessState,
  withHealthyExtractors,
  withFailingExtractors,
  emitRRKGoals,
  getMetricsSnapshot,
} from "./harness.js";

describe("Scenario E - Observability shape", () => {
  beforeEach(() => {
    resetHarnessState();
  });

  it("captures structured log entries for key lifecycle events and outputs correct metrics snapshot", async () => {
    // Spy on console.log and console.error
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const orchestrator = new RTKOrchestrator();

    // 1. Run a healthy burst
    withHealthyExtractors();
    await orchestrator.onSectionOpened("0.2");
    
    const healthyGoals = emitRRKGoals("rrk-goals.healthy.json").slice(0, 2); // 2 healthy goals
    await orchestrator.runBurst(healthyGoals, "0.2");

    // 2. Advance section to 0.3 (triggers smoke test)
    await orchestrator.onSectionAdvanced("0.3");

    // 3. Run a failing burst to trigger block and failure rate metrics
    withFailingExtractors(1.0); // 100% failure rate
    const failingGoals = emitRRKGoals("rrk-goals.healthy.json").slice(0, 2);
    await orchestrator.runBurst(failingGoals, "0.3");

    // 4. Assert structured log content
    const loggedMessages = logSpy.mock.calls.map((call) => call[0]).join("\n");
    
    // Validate burst creation/completion log traces
    expect(loggedMessages).toContain("[RTK Orchestrator] Section opened");
    // Validate smoke test log traces
    expect(loggedMessages).toContain("[RTK Orchestrator] Running smoke tests");

    // 5. Assert metrics snapshot
    const metrics = getMetricsSnapshot(orchestrator);
    
    expect(metrics).toHaveProperty("rtk_bursts_active");
    expect(metrics).toHaveProperty("rtk_burst_failure_rate");
    expect(metrics).toHaveProperty("rtk_jobs_in_flight");
    expect(metrics).toHaveProperty("rtk_sections_blocked");

    // Detailed metrics assertions
    expect(metrics.rtk_bursts_active).toBe(0); // completed bursts are cleaned up from open_bursts
    expect(metrics.rtk_burst_failure_rate).toBe(1.0); // the last burst failed completely (100% failure rate)
    expect(metrics.rtk_jobs_in_flight).toBe(0);
    expect(metrics.rtk_sections_blocked).toBe(1); // section 0.3 should be blocked now due to the 100% failure rate

    // Restore original console methods
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
