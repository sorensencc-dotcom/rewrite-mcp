// File: projects/cic/src/apr/autonomous-planner.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { PlanningGoal, PlanningTask, PlanningPlan } from "./types.js";

export interface PlannerInputs {
  roadmapDeltas?: any[];
  memoryTrends?: any;
  skillHotspots?: {
    orphanSkills?: any[];
    unusedAgents?: any[];
    denseNodes?: any[];
  };
}

export class AutonomousPlanner {
  constructor(private workspaceRoot: string) {}

  public loadInputs(): PlannerInputs {
    const inputs: PlannerInputs = {};

    // 1. Ingest ARPS roadmap deltas
    const deltaDir = path.resolve(this.workspaceRoot, "projects/cic/.artifacts/roadmap");
    if (fs.existsSync(deltaDir)) {
      try {
        const files = fs.readdirSync(deltaDir).filter(f => f.startsWith("delta-")).sort().reverse();
        if (files.length > 0) {
          const deltaPath = path.join(deltaDir, files[0]);
          const deltaContent = fs.readFileSync(deltaPath, "utf8");
          inputs.roadmapDeltas = [JSON.parse(deltaContent)];
        }
      } catch (err) {
        console.error("AutonomousPlanner failed to ingest ARPS deltas:", err);
      }
    }

    // 2. Ingest Memory trends
    const memoryLedgerPath = path.resolve(this.workspaceRoot, "projects/cic/data/memory-ledger.jsonl");
    if (fs.existsSync(memoryLedgerPath)) {
      try {
        // Mock query/synthesizer log ingestion
        // In a real run, this parses the ledger and detects repeated failures
        const content = fs.readFileSync(memoryLedgerPath, "utf8");
        const lines = content.split("\n").filter(l => l.trim() !== "");
        const events = lines.map(l => JSON.parse(l));
        const failures = events.filter(e => e.payload && e.payload.status === "failed");
        inputs.memoryTrends = {
          failuresCount: failures.length,
          hasStagnation: events.some(e => e.type === "lane.progress" && e.payload?.stagnant === true),
          hasDrift: events.some(e => e.type === "sandbox.decision" && e.payload?.similarity < 0.85)
        };
      } catch {}
    }

    // 3. Ingest Skill Graph hotspots
    const graphPath = path.resolve(this.workspaceRoot, "projects/cic/skill-graph/graph.json");
    if (fs.existsSync(graphPath)) {
      try {
        const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
        inputs.skillHotspots = graph.meta?.hotspots || { orphanSkills: [], unusedAgents: [], denseNodes: [] };
      } catch {}
    }

    return inputs;
  }

  public plan(inputs: PlannerInputs): PlanningPlan {
    const goals: PlanningGoal[] = [];
    const tasks: PlanningTask[] = [];

    // Trigger Goal 1: Memory failures remediation
    if (inputs.memoryTrends?.failuresCount && inputs.memoryTrends.failuresCount >= 3) {
      const goalId = `goal_mem_fail_${Date.now()}`;
      goals.push({
        id: goalId,
        title: "Remediate Repeated Memory Failures",
        description: `Detected ${inputs.memoryTrends.failuresCount} failures in the memory substrate. Need to deploy retry loops.`,
        priority: "high",
        source: "memory",
        status: "pending",
        createdAt: new Date().toISOString()
      });

      tasks.push({
        id: `task_mem_fail_retry_${Date.now()}`,
        goalId,
        title: "Implement retry safeguards",
        description: "Scale back parallel workers and add robust exponential backoffs.",
        owner: "agent:TokenEconomyAgent",
        status: "pending",
        type: "AUTO_EXECUTABLE"
      });
    }

    // Trigger Goal 2: Orphan skill alignment
    if (inputs.skillHotspots?.orphanSkills && inputs.skillHotspots.orphanSkills.length > 0) {
      const goalId = `goal_skill_orphan_${Date.now()}`;
      goals.push({
        id: goalId,
        title: "Resolve Skill Graph Orphan Nodes",
        description: `Found ${inputs.skillHotspots.orphanSkills.length} skills that are not implemented by any active agent.`,
        priority: "medium",
        source: "skills",
        status: "pending",
        createdAt: new Date().toISOString()
      });

      for (const orphan of inputs.skillHotspots.orphanSkills) {
        tasks.push({
          id: `task_orphan_${orphan.id.replace(/:/g, "_")}_${Date.now()}`,
          goalId,
          title: `Map orphan skill ${orphan.name}`,
          description: `Associate skill ${orphan.id} to an existing agent or request external operator mapping.`,
          owner: "agent:RedesignAgent",
          status: "pending",
          type: "OPERATOR_REQUIRED"
        });
      }
    }

    // Trigger Goal 3: Prompt drift Jaccard check
    if (inputs.memoryTrends?.hasDrift) {
      const goalId = `goal_prompt_drift_${Date.now()}`;
      goals.push({
        id: goalId,
        title: "Mitigate Prompt Drift",
        description: "Detected template similarity values falling below the 0.85 similarity floor.",
        priority: "high",
        source: "memory",
        status: "pending",
        createdAt: new Date().toISOString()
      });

      tasks.push({
        id: `task_drift_jaccard_${Date.now()}`,
        goalId,
        title: "Trigger Jaccard fallback checks",
        description: "Recalibrate active PMS prompt templates and compare Jaccard drift indices.",
        owner: "agent:RedesignAgent",
        status: "pending",
        type: "AUTO_EXECUTABLE"
      });
    }

    // Fallback goal if none are generated
    if (goals.length === 0) {
      const goalId = `goal_nominal_${Date.now()}`;
      goals.push({
        id: goalId,
        title: "Nominal System Planning",
        description: "All monitored matrices are nominal. Synthesizing maintenance check tasks.",
        priority: "low",
        source: "arps",
        status: "pending",
        createdAt: new Date().toISOString()
      });

      tasks.push({
        id: `task_nominal_check_${Date.now()}`,
        goalId,
        title: "Run dry-run smoke tests",
        description: "Verify control-plane connectivity and integrity Sentinel checks.",
        owner: "agent:RedesignAgent",
        status: "pending",
        type: "AUTO_EXECUTABLE"
      });
    }

    return { goals, tasks };
  }
}
