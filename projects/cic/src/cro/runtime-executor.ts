// File: projects/cic/src/cro/runtime-executor.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { TaskExecution, ExecutionEpisode, ExecutionStats } from "./types.js";
import { AgentSupervisor } from "./agent-supervisor.js";
import { CoreAgentRunner } from "./agent-runner.js";

export class RuntimeExecutor {
  private logPath: string;
  private maxWorkers: number;
  private maxQueueLength = 100;
  private supervisor: AgentSupervisor;

  constructor(private workspaceRoot: string) {
    this.logPath = path.resolve(this.workspaceRoot, "projects/cic/.cro/executions.jsonl");
    
    // Configurable max workers (default 2, limit range 1-4)
    const envWorkers = process.env.CIC_CRO_MAX_WORKERS;
    this.maxWorkers = envWorkers ? Math.min(4, Math.max(1, parseInt(envWorkers, 10))) : 2;

    this.supervisor = new AgentSupervisor(new CoreAgentRunner());
  }

  public async runBatch(tasks: TaskExecution[], isDryRun = true): Promise<ExecutionEpisode> {
    const episodeId = `exec_${Math.random().toString(36).substring(2, 11)}`;
    const logs: string[] = [];
    const onLog = (msg: string) => {
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
      status: "pending" as const,
      retryCount: 0
    }));

    const activeWorkers: Promise<void>[] = [];
    let activeWorkersCount = 0;
    let totalExecuted = 0;
    let totalFailed = 0;

    const runTask = async (task: TaskExecution) => {
      activeWorkersCount++;
      try {
        await this.supervisor.executeWithSupervision(task, isDryRun, onLog);
        totalExecuted++;
        if (task.status === "failed") {
          totalFailed++;
        }
      } catch (err: any) {
        task.status = "failed";
        task.error = err.message;
        totalFailed++;
        onLog(`[Executor] Fatal supervisor crash for task ${task.taskId}: ${err.message}`);
      } finally {
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

    const stats: ExecutionStats = {
      activeWorkers: activeWorkersCount,
      queueLength: queuedTasks.filter(t => t.status === "pending" || t.status === "running").length,
      totalExecuted,
      totalFailed
    };

    const episode: ExecutionEpisode = {
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

  private logEpisode(episode: ExecutionEpisode): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(this.logPath, JSON.stringify(episode) + "\n", "utf8");
  }

  public getEpisodes(): ExecutionEpisode[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }
    const content = fs.readFileSync(this.logPath, "utf8");
    const lines = content.split("\n").filter(l => l.trim() !== "");
    return lines.map(l => JSON.parse(l));
  }
}
