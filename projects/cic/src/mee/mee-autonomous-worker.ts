// File: projects/cic/src/mee/mee-autonomous-worker.ts | Date: 2026-06-03 | v1.0.0

import { MeeAutonomousEngine, MeeAutonomousJobStore } from "./mee-autonomous-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";

export class MeeAutonomousWorker {
  private isRunning = false;

  constructor(
    private readonly jobs: MeeAutonomousJobStore,
    private readonly runs: MeeRunEngine,
    private readonly engine: MeeAutonomousEngine,
    private readonly workspacePath: string,
  ) {}

  async start(intervalMs = 100) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start background loop without blocking caller
    this.loop(intervalMs).catch((err) => {
      console.error("MeeAutonomousWorker loop crashed:", err);
    });
  }

  private async loop(intervalMs: number) {
    while (this.isRunning) {
      try {
        const activeJobs = this.jobs.list().filter((j) => j.status === "running");

        for (const job of activeJobs) {
          const run = job.runId ? this.runs.getRun(job.runId) : undefined;
          if (!run) continue;

          // If run is finished (completed or failed), synchronize status
          if (run.status === "completed") {
            job.status = "completed";
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
            continue;
          } else if (run.status === "failed" || run.status === "canceled") {
            job.status = run.status === "canceled" ? "failed" : "failed";
            job.error = run.error || { message: `Run finished with status: ${run.status}` };
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
            continue;
          }

          // Determine next proposal
          const nextIndex = run.currentStepIndex;
          const proposalId = job.proposalIds[nextIndex];
          if (!proposalId) {
            // No more proposals but run not completed, complete it
            job.status = "completed";
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
            continue;
          }

          // Execute step
          try {
            await this.engine.executeStep(job.id, proposalId, this.workspacePath);
          } catch (err: any) {
            console.error(`Error executing step for job ${job.id}:`, err);
            job.status = "failed";
            job.error = { message: err.message || "Execution exception occurred", code: "worker_exception" };
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
          }
        }
      } catch (loopErr) {
        console.error("Error in MeeAutonomousWorker poll iteration:", loopErr);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  stop() {
    this.isRunning = false;
  }
}
