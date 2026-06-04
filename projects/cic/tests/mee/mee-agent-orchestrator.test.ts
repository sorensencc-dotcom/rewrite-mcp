// File: projects/cic/tests/mee/mee-agent-orchestrator.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { MeeAgentOrchestrator, AgentImpl } from "../../src/mee/mee-agent-orchestrator.js";
import { MeeAutonomousJob, PlanTree, MeeAgentTask, MeeAgentExchange } from "../../src/mee/mee-schema.js";

describe("MeeAgentOrchestrator", () => {
  const testDir = path.resolve(process.cwd(), "projects/cic/data/test-orchestrator");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const dummyJob: MeeAutonomousJob = {
    id: "job-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "pending",
    request: "Add new schema",
    proposalIds: [],
  };

  const dummyPlan: PlanTree = {
    rootRequest: "Add new schema",
    summary: "Plan to add new schema",
    tasks: [],
  };

  class MockPlannerAgent implements AgentImpl {
    constructor(public readonly id: string, public readonly role: "planner") {}

    async handleTask(task: MeeAgentTask): Promise<MeeAgentExchange> {
      return {
        id: "exchange-res-1",
        taskId: task.id,
        agentId: this.id,
        createdAt: new Date().toISOString(),
        direction: "response",
        content: JSON.stringify({ refinedPlan: { rootRequest: "Refined Plan", summary: "Refined", tasks: [] } }),
      };
    }
  }

  it("should register agent and schedule plan refinement task", () => {
    const orchestrator = new MeeAgentOrchestrator(testDir);
    const agent = new MockPlannerAgent("planner-1", "planner");
    orchestrator.registerAgent(agent);

    const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
    expect(tasks.length).toBe(1);
    expect(tasks[0].agentId).toBe("planner-1");
    expect(tasks[0].type).toBe("plan_refinement");
    expect(tasks[0].status).toBe("pending");

    const loadedTasks = orchestrator.loadTasks();
    expect(loadedTasks).toEqual(tasks);
  });

  it("should dispatch task and record exchanges", async () => {
    const orchestrator = new MeeAgentOrchestrator(testDir);
    const agent = new MockPlannerAgent("planner-1", "planner");
    orchestrator.registerAgent(agent);

    const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
    const taskId = tasks[0].id;

    await orchestrator.dispatchTask(taskId);

    const updatedTasks = orchestrator.loadTasks();
    expect(updatedTasks[0].status).toBe("completed");

    const exchanges = orchestrator.loadExchanges();
    expect(exchanges.length).toBe(2); // Request and Response exchanges
    expect(exchanges[0].direction).toBe("request");
    expect(exchanges[1].direction).toBe("response");

    const history = orchestrator.getTaskHistory(taskId);
    expect(history.length).toBe(2);

    const jobTasks = orchestrator.getTasksForJob(dummyJob.id);
    expect(jobTasks.length).toBe(1);

    const jobExchanges = orchestrator.getExchangesForJob(dummyJob.id);
    expect(jobExchanges.length).toBe(2);
  });

  it("should mark task as failed if agent throws", async () => {
    const orchestrator = new MeeAgentOrchestrator(testDir);
    const failingAgent: AgentImpl = {
      id: "failing-1",
      role: "planner",
      handleTask: async () => {
        throw new Error("Agent processing error");
      },
    };
    orchestrator.registerAgent(failingAgent);

    const tasks = orchestrator.scheduleTasksForPlan(dummyJob, dummyPlan);
    const taskId = tasks[0].id;

    await orchestrator.dispatchTask(taskId);

    const updatedTasks = orchestrator.loadTasks();
    expect(updatedTasks[0].status).toBe("failed");
    expect(updatedTasks[0].errorMessage).toBe("Agent processing error");
  });
});
