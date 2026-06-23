"use strict";
// File: projects/cic/src/cro/runtime-executor.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeExecutor = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const agent_supervisor_js_1 = require("./agent-supervisor.js");
const agent_runner_js_1 = require("./agent-runner.js");
class RuntimeExecutor {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.maxQueueLength = 100;
        this.logPath = node_path_1.default.resolve(this.workspaceRoot, "projects/cic/.cro/executions.jsonl");
        // Configurable max workers (default 2, limit range 1-4)
        const envWorkers = process.env.CIC_CRO_MAX_WORKERS;
        this.maxWorkers = envWorkers ? Math.min(4, Math.max(1, parseInt(envWorkers, 10))) : 2;
        this.supervisor = new agent_supervisor_js_1.AgentSupervisor(new agent_runner_js_1.CoreAgentRunner());
    }
    async runBatch(tasks, isDryRun = true) {
        const episodeId = `exec_${Math.random().toString(36).substring(2, 11)}`;
        const logs = [];
        const onLog = (msg) => {
            logs.push(`[${new Date().toISOString()}] ${msg}`);
            console.log(msg);
        };
        onLog(`[Executor] Starting batch run ${episodeId} with ${tasks.length} tasks (dryRun=${isDryRun}). Concurrency bound: ${this.maxWorkers} workers.`);
        if (tasks.length > this.maxQueueLength) {
            throw new Error(`Queue length limit exceeded. Bounded capacity is ${this.maxQueueLength} tasks.`);
        }
        // Initialize tasks status
        const queuedTasks = tasks.map(t => ({
            ...t,
            status: "pending",
            retryCount: 0
        }));
        const activeWorkers = [];
        let activeWorkersCount = 0;
        let totalExecuted = 0;
        let totalFailed = 0;
        const runTask = async (task) => {
            activeWorkersCount++;
            try {
                await this.supervisor.executeWithSupervision(task, isDryRun, onLog);
                totalExecuted++;
                if (task.status === "failed") {
                    totalFailed++;
                }
            }
            catch (err) {
                task.status = "failed";
                task.error = err.message;
                totalFailed++;
                onLog(`[Executor] Fatal supervisor crash for task ${task.taskId}: ${err.message}`);
            }
            finally {
                activeWorkersCount--;
            }
        };
        // Parallel schedule worker pool execution
        for (const task of queuedTasks) {
            if (activeWorkersCount >= this.maxWorkers) {
                onLog(`[Executor] Worker capacity limit reached. Pausing task queue dispatch...`);
                await Promise.race(activeWorkers);
            }
            const promise = runTask(task);
            activeWorkers.push(promise);
            // Clean up finished worker promises
            promise.finally(() => {
                const index = activeWorkers.indexOf(promise);
                if (index !== -1) {
                    activeWorkers.splice(index, 1);
                }
            });
        }
        // Wait for remaining active workers to finalize
        await Promise.all(activeWorkers);
        const stats = {
            activeWorkers: activeWorkersCount,
            queueLength: queuedTasks.filter(t => t.status === "pending" || t.status === "running").length,
            totalExecuted,
            totalFailed
        };
        const episode = {
            id: episodeId,
            timestamp: new Date().toISOString(),
            tasks: queuedTasks,
            status: isDryRun ? "dry_run" : "committed",
            stats,
            logs
        };
        if (!isDryRun) {
            this.logEpisode(episode);
        }
        return episode;
    }
    logEpisode(episode) {
        const dir = node_path_1.default.dirname(this.logPath);
        if (!node_fs_1.default.existsSync(dir)) {
            node_fs_1.default.mkdirSync(dir, { recursive: true });
        }
        node_fs_1.default.appendFileSync(this.logPath, JSON.stringify(episode) + "\n", "utf8");
    }
    getEpisodes() {
        if (!node_fs_1.default.existsSync(this.logPath)) {
            return [];
        }
        const content = node_fs_1.default.readFileSync(this.logPath, "utf8");
        const lines = content.split("\n").filter(l => l.trim() !== "");
        return lines.map(l => JSON.parse(l));
    }
}
exports.RuntimeExecutor = RuntimeExecutor;
//# sourceMappingURL=runtime-executor.js.map