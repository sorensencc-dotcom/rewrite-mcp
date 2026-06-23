"use strict";
// File: projects/cic/src/cro/agent-supervisor.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSupervisor = void 0;
class AgentSupervisor {
    constructor(runner, maxRetries = 3) {
        this.runner = runner;
        this.maxRetries = maxRetries;
    }
    async executeWithSupervision(task, isDryRun, onLog) {
        task.status = "running";
        task.startTime = new Date().toISOString();
        onLog(`[Supervisor] Launching execution for task ${task.taskId} owned by ${task.owner}...`);
        while (task.retryCount <= this.maxRetries) {
            try {
                if (task.owner.includes("Unknown")) {
                    throw new Error(`Failed to resolve agent runner implementation for '${task.owner}'.`);
                }
                const result = await this.runner.run(task, isDryRun);
                task.status = "completed";
                task.result = result;
                task.endTime = new Date().toISOString();
                onLog(`[Supervisor] Task ${task.taskId} completed successfully on attempt ${task.retryCount + 1}.`);
                return task;
            }
            catch (err) {
                task.retryCount++;
                onLog(`[Supervisor] Error running task ${task.taskId} (Attempt ${task.retryCount}/${this.maxRetries + 1}): ${err.message}`);
                if (task.retryCount > this.maxRetries) {
                    task.status = "failed";
                    task.error = err.message;
                    task.endTime = new Date().toISOString();
                    onLog(`[Supervisor] Task ${task.taskId} failed permanently after exceeding retry limits.`);
                    break;
                }
                // Bounded linear backoff delay
                const delayMs = task.retryCount * 100;
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        return task;
    }
}
exports.AgentSupervisor = AgentSupervisor;
//# sourceMappingURL=agent-supervisor.js.map