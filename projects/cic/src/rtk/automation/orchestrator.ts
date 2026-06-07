import { RTKAutomationStateTracker } from "./state.js";
import { BurstPlanner } from "./bursts.js";
import { SmokeTestRunner } from "./smoke.js";
import { generateGovernanceDelta } from "../../runtime/cic-gitai.js";

export class RTKOrchestrator {
  private stateTracker: RTKAutomationStateTracker;
  private planner: BurstPlanner;
  private runner: SmokeTestRunner;

  constructor() {
    this.stateTracker = new RTKAutomationStateTracker();
    this.planner = new BurstPlanner();
    this.runner = new SmokeTestRunner();
  }

  getStateTracker(): RTKAutomationStateTracker {
    return this.stateTracker;
  }

  getPlanner(): BurstPlanner {
    return this.planner;
  }

  getRunner(): SmokeTestRunner {
    return this.runner;
  }

  async onSectionOpened(sectionId: string): Promise<void> {
    this.stateTracker.setActiveSection(sectionId);
    console.log(`[RTK Orchestrator] Section opened: ${sectionId}`);
  }

  async onSectionAdvanced(sectionId: string): Promise<{ ok: boolean; error?: string }> {
    console.log(`[RTK Orchestrator] Running smoke tests for advanced section: ${sectionId}`);
    const smokeRes = await this.runner.runSmokeTests(sectionId);
    
    if (smokeRes.ok) {
      this.stateTracker.setActiveSection(sectionId);
      return { ok: true };
    } else {
      this.stateTracker.blockSection(sectionId);
      
      // Emit governance feedback event
      try {
        generateGovernanceDelta({
          system: "1.1.0",
          state: "1.1.0",
          roadmap: "2.7.0",
          changes: [`[RTK] Section ${sectionId} blocked: ${smokeRes.error}`],
        });
      } catch (err) {
        console.error("[RTK Orchestrator] Failed to emit governance delta:", err);
      }

      return { ok: false, error: smokeRes.error };
    }
  }

  async runBurst(goals: any[], sectionId: string, priority: "low" | "normal" | "high" = "normal"): Promise<any> {
    if (this.stateTracker.getState().blocked_sections.includes(sectionId)) {
      throw new Error(`Cannot run burst on blocked section: ${sectionId}`);
    }

    const burst = this.planner.planBurst(goals, sectionId, priority);
    this.stateTracker.addBurst(burst);

    const jobs = burst.jobs.map((jobId, idx) => ({
      job_id: jobId,
      type: goals[idx]?.target_type || "image",
      source: goals[idx]?.goal_id || "goal-1",
      target: goals[idx]?.target,
      extractor_type: goals[idx]?.target_type || "image",
      pms_template_id: goals[idx]?.target_type === "text" ? "text_analysis_v1" : "image_analysis_v1",
      section_id: sectionId,
    }));

    const outcome = await this.planner.dispatchBurst(burst, jobs);
    const total = outcome.successCount + outcome.failureCount;
    const rate = total > 0 ? outcome.failureCount / total : 0;
    this.stateTracker.setFailureRate(rate);

    if (rate > 0.5) {
      this.stateTracker.blockSection(sectionId);
      try {
        generateGovernanceDelta({
          system: "1.1.0",
          state: "1.1.0",
          roadmap: "2.7.0",
          changes: [`[RTK] Section ${sectionId} blocked due to high failure rate: ${rate * 100}%`],
        });
      } catch (err) {
        console.error("[RTK Orchestrator] Failed to emit failure rate governance delta:", err);
      }
    }

    this.stateTracker.completeBurst(burst.burst_id);
    return outcome;
  }
}
export const orchestrator = new RTKOrchestrator();
