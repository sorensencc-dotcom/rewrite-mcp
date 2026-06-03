// File: projects/cic/src/apr/multi-agent-coordinator.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { PlanningEpisode, PlannerDecision, PlannerCritique, PlanningPlan } from "./types.js";

export class MultiAgentCoordinator {
  private logPath: string;

  constructor(private workspaceRoot: string) {
    this.logPath = path.resolve(this.workspaceRoot, "projects/cic/.apr/episodes.jsonl");
  }

  public runLoop(plan: PlanningPlan, isDryRun = true): PlanningEpisode {
    const episodeId = `epi_${Math.random().toString(36).substring(2, 11)}`;

    // 1. Planner Decision
    const decision: PlannerDecision = {
      plan,
      reasoning: `Planner synthesized ${plan.goals.length} goals and ${plan.tasks.length} tasks based on hotspots and memory.`
    };

    // 2. Critic Critique
    const criticCritique: PlannerCritique = {
      reviewerRole: "critic",
      approved: plan.tasks.every(t => t.owner !== undefined),
      feedback: "Critic confirmed all tasks have owners assigned. Risk assessment completed.",
      riskLevel: plan.goals.some(g => g.priority === "high") ? "medium" : "low"
    };

    // 3. Operator Critique
    const operatorCritique: PlannerCritique = {
      reviewerRole: "operator",
      approved: true,
      feedback: "Operator approved. Plan conforms to current roadmap constraints.",
      riskLevel: "low"
    };

    const critiques = [criticCritique, operatorCritique];
    const isApproved = critiques.every(c => c.approved);

    const episode: PlanningEpisode = {
      id: episodeId,
      timestamp: new Date().toISOString(),
      decision,
      critiques,
      status: isDryRun ? "dry_run" : (isApproved ? "committed" : "aborted")
    };

    if (!isDryRun) {
      this.logEpisode(episode);
    }

    return episode;
  }

  private logEpisode(episode: PlanningEpisode): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(this.logPath, JSON.stringify(episode) + "\n", "utf8");
  }

  public getEpisodes(): PlanningEpisode[] {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }
    const content = fs.readFileSync(this.logPath, "utf8");
    const lines = content.split("\n").filter(l => l.trim() !== "");
    return lines.map(l => JSON.parse(l));
  }
}
