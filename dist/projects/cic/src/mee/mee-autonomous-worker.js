"use strict";
// File: projects/cic/src/mee/mee-autonomous-worker.ts | Date: 2026-06-04 | v1.1.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeAutonomousWorker = void 0;
class MeeAutonomousWorker {
    constructor(jobs, runs, engine, workspacePath) {
        this.jobs = jobs;
        this.runs = runs;
        this.engine = engine;
        this.workspacePath = workspacePath;
        this.isRunning = false;
        this.processingJobs = new Set();
    }
    async start(intervalMs = 100) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Start background loop without blocking caller
        this.loop(intervalMs).catch((err) => {
            console.error("MeeAutonomousWorker loop crashed:", err);
        });
    }
    async loop(intervalMs) {
        let currentIntervalMs = intervalMs;
        while (this.isRunning) {
            try {
                const activeJobs = this.jobs.list().filter((j) => j.status === "running");
                for (const job of activeJobs) {
                    if (this.processingJobs.has(job.id)) {
                        continue;
                    }
                    this.processingJobs.add(job.id);
                    try {
                        const run = job.runId ? this.runs.getRun(job.runId) : undefined;
                        if (!run)
                            continue;
                        // If run is finished (completed or failed), synchronize status
                        if (run.status === "completed") {
                            job.status = "completed";
                            job.updatedAt = new Date().toISOString();
                            this.jobs.save(job);
                            this.engine.addMemory("job", job.id, job.runId, ["success", "completed"], `Job ${job.id} completed successfully`, `All proposals in the plan ${job.planId || ""} were applied and verified successfully.`);
                            continue;
                        }
                        else if (run.status === "failed" || run.status === "canceled") {
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
                            this.engine.addMemory("job", job.id, job.runId, ["success", "completed"], `Job ${job.id} completed successfully`, `All proposals in the plan ${job.planId || ""} were applied and verified successfully.`);
                            continue;
                        }
                        // Execute step
                        try {
                            await this.engine.executeStep(job.id, proposalId, this.workspacePath);
                        }
                        catch (err) {
                            console.error(`Error executing step for job ${job.id}:`, err);
                            job.status = "failed";
                            job.error = { message: err.message || "Execution exception occurred", code: "worker_exception" };
                            job.updatedAt = new Date().toISOString();
                            this.jobs.save(job);
                        }
                    }
                    finally {
                        this.processingJobs.delete(job.id);
                    }
                }
                // Reset backoff on successful execution loop
                currentIntervalMs = intervalMs;
            }
            catch (loopErr) {
                console.error("Error in MeeAutonomousWorker poll iteration:", loopErr);
                // Exponential backoff up to 5 seconds
                currentIntervalMs = Math.min(currentIntervalMs * 2, 5000);
            }
            // Apply random jitter (0 to 50ms) to prevent synchronization issues
            const jitter = Math.random() * 50;
            await new Promise((resolve) => setTimeout(resolve, currentIntervalMs + jitter));
        }
    }
    stop() {
        this.isRunning = false;
        this.processingJobs.clear();
    }
}
exports.MeeAutonomousWorker = MeeAutonomousWorker;
//# sourceMappingURL=mee-autonomous-worker.js.map