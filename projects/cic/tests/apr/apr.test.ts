// File: projects/cic/tests/apr/apr.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AutonomousPlanner } from "../../src/apr/autonomous-planner.js";
import { MultiAgentCoordinator } from "../../src/apr/multi-agent-coordinator.js";
import { TaskAllocator } from "../../src/apr/task-allocator.js";
import { SkillGraphStore, SkillGraph } from "../../src/skills/skill-graph-store.js";
import { registerAprRoutes } from "../../src/cic/control-plane/apr-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 25 — Autonomous Planner & Multi-Agent Reasoning (APR)", () => {
  const tempEpisodesLog = path.resolve(__dirname, "../../.apr/temp-test-episodes.jsonl");
  const tempGraphPath = path.resolve(__dirname, "../../skill-graph/temp-test-graph.json");

  beforeEach(() => {
    if (fs.existsSync(tempEpisodesLog)) {
      fs.unlinkSync(tempEpisodesLog);
    }
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempEpisodesLog)) {
      fs.unlinkSync(tempEpisodesLog);
    }
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
  });

  it("AutonomousPlanner generates correct goals and tasks based on inputs", () => {
    const planner = new AutonomousPlanner(path.resolve(__dirname, "../.."));

    // 1. Ingest nominal inputs
    const nominalPlan = planner.plan({});
    expect(nominalPlan.goals.length).toBe(1);
    expect(nominalPlan.goals[0].priority).toBe("low");
    expect(nominalPlan.tasks.length).toBe(1);
    expect(nominalPlan.tasks[0].owner).toBe("agent:RedesignAgent");

    // 2. Ingest failure trends
    const failurePlan = planner.plan({
      memoryTrends: { failuresCount: 4 }
    });
    expect(failurePlan.goals.some(g => g.source === "memory" && g.priority === "high")).toBe(true);
    expect(failurePlan.tasks.some(t => t.owner === "agent:TokenEconomyAgent")).toBe(true);

    // 3. Ingest skill hotspots
    const skillsPlan = planner.plan({
      skillHotspots: {
        orphanSkills: [{ id: "skill:custom/test", name: "test-skill" }]
      }
    });
    expect(skillsPlan.goals.some(g => g.source === "skills")).toBe(true);
    expect(skillsPlan.tasks.some(t => t.owner === "agent:RedesignAgent")).toBe(true);
  });

  it("MultiAgentCoordinator runs critique loop and logs committed episodes", () => {
    const coordinator = new MultiAgentCoordinator(path.resolve(__dirname, "../.."));
    // Override logPath for tests
    (coordinator as any).logPath = tempEpisodesLog;

    const samplePlan = {
      goals: [
        {
          id: "g-1",
          title: "Test Goal",
          description: "Test Desc",
          priority: "high" as const,
          source: "test",
          status: "pending" as const,
          createdAt: new Date().toISOString()
        }
      ],
      tasks: [
        {
          id: "t-1",
          goalId: "g-1",
          title: "Test Task",
          description: "Test Desc",
          owner: "agent:RedesignAgent",
          status: "pending" as const,
          type: "AUTO_EXECUTABLE" as const
        }
      ]
    };

    // Dry Run should not write to disk
    const dryEpisode = coordinator.runLoop(samplePlan, true);
    expect(dryEpisode.status).toBe("dry_run");
    expect(dryEpisode.critiques.length).toBe(2);
    expect(fs.existsSync(tempEpisodesLog)).toBe(false);

    // Commit should write to disk
    const committedEpisode = coordinator.runLoop(samplePlan, false);
    expect(committedEpisode.status).toBe("committed");
    expect(fs.existsSync(tempEpisodesLog)).toBe(true);

    const episodes = coordinator.getEpisodes();
    expect(episodes.length).toBe(1);
    expect(episodes[0].id).toBe(committedEpisode.id);
  });

  it("TaskAllocator allocates tasks using Skill Graph", () => {
    const skillStore = new SkillGraphStore(tempGraphPath);
    const sampleGraph: SkillGraph = {
      nodes: [
        { id: "agent:TokenEconomyAgent", type: "agent", name: "Token Economy Agent" }
      ],
      edges: []
    };
    skillStore.save(sampleGraph);

    const allocator = new TaskAllocator(skillStore);

    const task1 = {
      id: "t-1",
      goalId: "g-1",
      title: "Retry task",
      description: "Test retry",
      owner: "agent:TokenEconomyAgent",
      status: "pending" as const,
      type: "AUTO_EXECUTABLE" as const
    };

    const task2 = {
      id: "t-2",
      goalId: "g-1",
      title: "Unknown agent task",
      description: "Test unknown",
      owner: "agent:UnknownAgent",
      status: "pending" as const,
      type: "OPERATOR_REQUIRED" as const
    };

    const allocation1 = allocator.allocate(task1);
    expect(allocation1.owner).toBe("agent:TokenEconomyAgent");
    expect(allocation1.status).toBe("assigned");

    const allocation2 = allocator.allocate(task2);
    expect(allocation2.owner).toBe("operator");
    expect(allocation2.status).toBe("rejected"); // Operator required tasks return rejected status when auto routing
  });

  it("registerAprRoutes defines Express router paths", () => {
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

    registerAprRoutes(mockRouter as any);

    expect(registeredGets.has("/apr/episodes")).toBe(true);
    expect(registeredGets.has("/apr/episodes/:id")).toBe(true);
    expect(registeredPosts.has("/apr/plan")).toBe(true);
  });
});
