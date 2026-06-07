// File: projects/cic/src/mee/mee-scheduler.ts | Date: 2026-06-04 | v1.0.0

import { MeeAutonomousEngine, MeeAutonomousJobStore } from "./mee-autonomous-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
import { MeeAutonomousJob } from "./mee-schema.js";

export class MeeScheduler {
  private isRunning = false;
  private readonly activeJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly jobs: MeeAutonomousJobStore,
    private readonly runs: MeeRunEngine,
    private readonly engine: MeeAutonomousEngine,
    private readonly workspacePath: string,
    private readonly concurrencyLimit: number = 2
  ) {}

  public async start(intervalMs = 500) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Crash Recovery: Reset any job that was "running" to "paused" so it can be scheduled cleanly
    const allJobs = this.jobs.list();
    for (const job of allJobs) {
      if (job.status === "running") {
        job.status = "paused";
        job.updatedAt = new Date().toISOString();
        this.jobs.save(job);
      }
    }

    this.loop(intervalMs).catch((err) => {
      console.error("MeeScheduler loop crashed:", err);
    });
  }

  public stop() {
    this.isRunning = false;
    this.activeJobs.clear();
  }

  private async loop(intervalMs: number) {
    while (this.isRunning) {
      try {
        await this.tick();
      } catch (err) {
        console.error("Error in scheduler tick:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  public async tick() {
    const allJobs = this.jobs.list();

    // 1. Process finished runs to update job status
    for (const job of allJobs) {
      if (this.activeJobs.has(job.id)) {
        const run = job.runId ? this.runs.getRun(job.runId) : undefined;
        if (run) {
          if (run.status === "completed") {
            job.status = "completed";
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
            this.activeJobs.delete(job.id);
            this.engine.addMemory(
              "job",
              job.id,
              job.runId,
              ["success", "completed", "phase40"],
              `Job ${job.id} completed successfully`,
              `Scheduler finished job ${job.id}`
            );
          } else if (run.status === "failed" || run.status === "canceled") {
            job.status = "failed";
            job.error = run.error || { message: `Run status is ${run.status}` };
            job.updatedAt = new Date().toISOString();
            this.jobs.save(job);
            this.activeJobs.delete(job.id);
          }
        }
      }
    }

    // 2. Select eligible jobs (status in pending, paused, or running)
    const eligibleJobs = this.jobs.list().filter(
      (j) => j.status === "pending" || j.status === "paused" || j.status === "running"
    );

    // Filter by dependencies: all dependsOnJobIds must be "completed"
    const dependencyCheckedJobs = eligibleJobs.filter((job) => {
      if (!job.dependsOnJobIds || job.dependsOnJobIds.length === 0) return true;
      return job.dependsOnJobIds.every((depId) => {
        const depJob = this.jobs.get(depId);
        return depJob && depJob.status === "completed";
      });
    });

    // 3. Sort jobs by Priority and age (Starvation Prevention)
    const sortedJobs = dependencyCheckedJobs.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      const ageA = Date.now() - new Date(a.createdAt).getTime();
      const ageB = Date.now() - new Date(b.createdAt).getTime();

      // Priority weight 1000, age weight 0.0001 (starvation prevention)
      const scoreA = priorityA * 1000 + ageA * 0.0001;
      const scoreB = priorityB * 1000 + ageB * 0.0001;

      return scoreB - scoreA; // highest score first
    });

    // 4. Preemption check
    const runningActiveJobs = Array.from(this.activeJobs.keys())
      .map((id) => this.jobs.get(id))
      .filter(Boolean) as MeeAutonomousJob[];
    
    if (this.activeJobs.size >= this.concurrencyLimit && sortedJobs.length > 0) {
      // Find highest priority pending/paused job not currently running
      const nextPending = sortedJobs.find((j) => j.status === "pending" || j.status === "paused");
      if (nextPending) {
        const priorityPending = nextPending.priority ?? 0;
        
        // Find if there's any running job with strictly lower priority
        const runningSortedByPriority = [...runningActiveJobs].sort(
          (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
        );
        const lowestRunning = runningSortedByPriority[0];
        
        if (lowestRunning && (lowestRunning.priority ?? 0) < priorityPending) {
          // Preempt lowestRunning
          lowestRunning.status = "paused";
          lowestRunning.updatedAt = new Date().toISOString();
          this.jobs.save(lowestRunning);
          this.activeJobs.delete(lowestRunning.id);
          this.engine.addMemory(
            "job",
            lowestRunning.id,
            lowestRunning.runId,
            ["scheduler", "preemption", "phase40"],
            `Job ${lowestRunning.id} preempted by job ${nextPending.id}`,
            `Preempted job due to priority queue threshold.`
          );
        }
      }
    }

    // 5. Spawn new job workers
    for (const job of sortedJobs) {
      if (this.activeJobs.size >= this.concurrencyLimit) break;
      if (this.activeJobs.has(job.id)) continue;

      // Start job execution
      job.status = "running";
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);

      const promise = this.runJobStepLoop(job);
      this.activeJobs.set(job.id, promise);
    }
  }

  private async runJobStepLoop(job: MeeAutonomousJob): Promise<void> {
    try {
      if (!job.runId) {
        await this.engine.startJob(job.id);
      }

      while (this.isRunning && this.activeJobs.has(job.id)) {
        const currentJob = this.jobs.get(job.id);
        if (!currentJob || currentJob.status !== "running") break;

        const run = currentJob.runId ? this.runs.getRun(currentJob.runId) : undefined;
        if (!run || run.status === "completed" || run.status === "failed" || run.status === "canceled") {
          break;
        }

        const nextIndex = run.currentStepIndex;
        const proposalId = currentJob.proposalIds[nextIndex];
        if (!proposalId) {
          break;
        }

        await this.engine.executeStep(currentJob.id, proposalId, this.workspacePath);

        // Pause between ticks
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (err: any) {
      console.error(`Scheduler worker failed for job ${job.id}:`, err);
      job.status = "failed";
      job.error = { message: err.message || "Scheduler thread crashed", code: "scheduler_exception" };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);
      this.activeJobs.delete(job.id);
    }
  }

  public getQueueState() {
    return {
      activeCount: this.activeJobs.size,
      concurrencyLimit: this.concurrencyLimit,
      activeJobIds: Array.from(this.activeJobs.keys()),
      pausedJobIds: this.jobs.list().filter((j) => j.status === "paused").map((j) => j.id),
      pendingJobIds: this.jobs.list().filter((j) => j.status === "pending").map((j) => j.id)
    };
  }
}
