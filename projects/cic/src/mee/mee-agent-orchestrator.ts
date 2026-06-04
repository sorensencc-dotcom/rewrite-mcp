// File: projects/cic/src/mee/mee-agent-orchestrator.ts | Date: 2026-06-04 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  MeeAgent,
  MeeAgentTask,
  MeeAgentExchange,
  MeeAutonomousJob,
  PlanTree,
  MeeAgentRole,
} from "./mee-schema.js";

export interface AgentImpl {
  id: string;
  role: MeeAgentRole;
  handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}

export class MeeAgentOrchestrator {
  private agents = new Map<string, AgentImpl>();

  constructor(public readonly baseDir: string) {}

  public tasksFile() {
    return path.join(this.baseDir, "mee-agent-tasks.json");
  }

  public exchangesFile() {
    return path.join(this.baseDir, "mee-agent-exchanges.json");
  }

  public loadTasks(): MeeAgentTask[] {
    if (!fs.existsSync(this.tasksFile())) return [];
    try {
      const raw = fs.readFileSync(this.tasksFile(), "utf8");
      return JSON.parse(raw) as MeeAgentTask[];
    } catch {
      return [];
    }
  }

  public saveTasks(tasks: MeeAgentTask[]) {
    fs.mkdirSync(path.dirname(this.tasksFile()), { recursive: true });
    fs.writeFileSync(this.tasksFile(), JSON.stringify(tasks, null, 2), "utf8");
  }

  public loadExchanges(): MeeAgentExchange[] {
    if (!fs.existsSync(this.exchangesFile())) return [];
    try {
      const raw = fs.readFileSync(this.exchangesFile(), "utf8");
      return JSON.parse(raw) as MeeAgentExchange[];
    } catch {
      return [];
    }
  }

  public saveExchanges(exchanges: MeeAgentExchange[]) {
    fs.mkdirSync(path.dirname(this.exchangesFile()), { recursive: true });
    fs.writeFileSync(this.exchangesFile(), JSON.stringify(exchanges, null, 2), "utf8");
  }

  registerAgent(agent: AgentImpl) {
    this.agents.set(agent.id, agent);
  }

  scheduleTasksForPlan(job: MeeAutonomousJob, plan: PlanTree): MeeAgentTask[] {
    const planner = Array.from(this.agents.values()).find((a) => a.role === "planner");
    if (!planner) return [];

    const task: MeeAgentTask = {
      id: crypto.randomUUID(),
      agentId: planner.id,
      jobId: job.id,
      createdAt: new Date().toISOString(),
      type: "plan_refinement",
      payload: { plan, request: job.request, planningMode: job.planningMode },
      status: "pending",
    };

    const tasks = this.loadTasks();
    tasks.push(task);
    this.saveTasks(tasks);

    return [task];
  }

  async dispatchTask(taskId: string): Promise<void> {
    const tasks = this.loadTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const agent = this.agents.get(task.agentId);
    if (!agent) return;

    task.status = "running";
    this.saveTasks(tasks);

    const req: MeeAgentExchange = {
      id: crypto.randomUUID(),
      taskId: task.id,
      agentId: agent.id,
      createdAt: new Date().toISOString(),
      direction: "request",
      content: JSON.stringify(task.payload),
    };
    
    const exchanges = this.loadExchanges();
    exchanges.push(req);
    this.saveExchanges(exchanges);

    try {
      const res = await agent.handleTask(task);
      const updatedExchanges = this.loadExchanges();
      updatedExchanges.push(res);
      this.saveExchanges(updatedExchanges);
      
      const updatedTasks = this.loadTasks();
      const tIdx = updatedTasks.findIndex((t) => t.id === taskId);
      if (tIdx >= 0) {
        updatedTasks[tIdx].status = "completed";
        this.saveTasks(updatedTasks);
      }
    } catch (err: any) {
      const updatedTasks = this.loadTasks();
      const tIdx = updatedTasks.findIndex((t) => t.id === taskId);
      if (tIdx >= 0) {
        updatedTasks[tIdx].status = "failed";
        updatedTasks[tIdx].errorMessage = err?.message ?? String(err);
        this.saveTasks(updatedTasks);
      }
    }
  }

  getTaskHistory(taskId: string): MeeAgentExchange[] {
    return this.loadExchanges().filter((e) => e.taskId === taskId);
  }

  getTasksForJob(jobId: string): MeeAgentTask[] {
    return this.loadTasks().filter((t) => t.jobId === jobId);
  }

  getExchangesForJob(jobId: string): MeeAgentExchange[] {
    const jobTasks = this.getTasksForJob(jobId);
    const taskIds = new Set(jobTasks.map((t) => t.id));
    return this.loadExchanges().filter((e) => taskIds.has(e.taskId));
  }
}
