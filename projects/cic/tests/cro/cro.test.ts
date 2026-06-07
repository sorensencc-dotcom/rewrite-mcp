// File: projects/cic/tests/cro/cro.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeExecutor } from "../../src/cro/runtime-executor.js";
import { CoreAgentRunner } from "../../src/cro/agent-runner.js";
import { AgentSupervisor } from "../../src/cro/agent-supervisor.js";
import { TaskExecution } from "../../src/cro/types.js";
import { registerCroRoutes } from "../../src/cic/control-plane/cro-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 26 — CIC Runtime Orchestrator (CRO)", () => {
  const tempExecutionsLog = path.resolve(__dirname, "../../.cro/temp-test-executions.jsonl");

  beforeEach(() => {
    if (fs.existsSync(tempExecutionsLog)) {
      fs.unlinkSync(tempExecutionsLog);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempExecutionsLog)) {
      fs.unlinkSync(tempExecutionsLog);
    }
  });

  it("CoreAgentRunner resolves agent output based on owner name", async () => {
    const runner = new CoreAgentRunner();
    
    // Dry Run check
    const task: TaskExecution = {
      taskId: "t-1",
      goalId: "g-1",
      title: "Test Task",
      status: "pending",
      owner: "agent:TokenEconomyAgent",
      retryCount: 0
    };

    const dryResult = await runner.run(task, true);
    expect(dryResult.dryRun).toBe(true);

    // TokenEconomyAgent result
    const realResult = await runner.run(task, false);
    expect(realResult.action).toBe("retry_safeguards_deployed");
  });

  it("AgentSupervisor tracks execution state and handles retry recovery loops", async () => {
    const runner = new CoreAgentRunner();
    const supervisor = new AgentSupervisor(runner, 2); // max 2 retries
    const logs: string[] = [];
    const logCb = (m: string) => logs.push(m);

    // 1. Successful run
    const task1: TaskExecution = {
      taskId: "t-1",
      goalId: "g-1",
      title: "Task 1",
      status: "pending",
      owner: "agent:TokenEconomyAgent",
      retryCount: 0
    };

    const outcome1 = await supervisor.executeWithSupervision(task1, false, logCb);
    expect(outcome1.status).toBe("completed");
    expect(outcome1.retryCount).toBe(0);
    expect(logs.some(l => l.includes("completed successfully"))).toBe(true);

    // 2. Failed run with retries
    const task2: TaskExecution = {
      taskId: "t-2",
      goalId: "g-1",
      title: "Task 2",
      status: "pending",
      owner: "agent:UnknownAgent", // triggers error
      retryCount: 0
    };

    const outcome2 = await supervisor.executeWithSupervision(task2, false, logCb);
    expect(outcome2.status).toBe("failed");
    expect(outcome2.retryCount).toBe(3); // attempted 3 times (attempt 0, 1, 2) + failed status
    expect(logs.some(l => l.includes("failed permanently"))).toBe(true);
  });

  it("RuntimeExecutor schedules batch tasks respecting concurrency worker limits", async () => {
    const executor = new RuntimeExecutor(path.resolve(__dirname, "../.."));
    // Override log path
    (executor as any).logPath = tempExecutionsLog;
    
    // Set max workers to 2
    (executor as any).maxWorkers = 2;

    const tasks: TaskExecution[] = [
      { taskId: "t-1", goalId: "g-1", title: "Task 1", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 },
      { taskId: "t-2", goalId: "g-1", title: "Task 2", status: "pending", owner: "agent:RedesignAgent", retryCount: 0 },
      { taskId: "t-3", goalId: "g-1", title: "Task 3", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 }
    ];

    // Running batch with dry-run
    const episode = await executor.runBatch(tasks, true);
    expect(episode.status).toBe("dry_run");
    expect(episode.tasks.length).toBe(3);
    expect(episode.stats.totalExecuted).toBe(3);
    expect(episode.stats.totalFailed).toBe(0);
    expect(fs.existsSync(tempExecutionsLog)).toBe(false);

    // Running batch with commit
    const committedEpisode = await executor.runBatch(tasks, false);
    expect(committedEpisode.status).toBe("committed");
    expect(fs.existsSync(tempExecutionsLog)).toBe(true);

    const history = executor.getEpisodes();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(committedEpisode.id);
  });

  it("RuntimeExecutor respects queue backlog bounds and rejects massive batches", async () => {
    const executor = new RuntimeExecutor(path.resolve(__dirname, "../.."));
    (executor as any).maxQueueLength = 2; // limit to 2

    const tasks: TaskExecution[] = [
      { taskId: "t-1", goalId: "g-1", title: "Task 1", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 },
      { taskId: "t-2", goalId: "g-1", title: "Task 2", status: "pending", owner: "agent:RedesignAgent", retryCount: 0 },
      { taskId: "t-3", goalId: "g-1", title: "Task 3", status: "pending", owner: "agent:TokenEconomyAgent", retryCount: 0 }
    ];

    await expect(executor.runBatch(tasks, true)).rejects.toThrow("Queue length limit exceeded");
  });

  it("registerCroRoutes registers REST routes", () => {
    const registeredGets = new Map<string, Function>();
    const registeredPosts = new Map<string, Function>();

    const mockRouter = {
      get(path: string, handler: Function) {
        registeredGets.set(path, handler);
      },
      post(path: string, handler: Function) {
        registeredPosts.set(path, handler);
      }
    };

    registerCroRoutes(mockRouter as any);

    expect(registeredGets.has("/cro/episodes")).toBe(true);
    expect(registeredGets.has("/cro/episodes/:id")).toBe(true);
    expect(registeredPosts.has("/cro/execute")).toBe(true);
  });
});
