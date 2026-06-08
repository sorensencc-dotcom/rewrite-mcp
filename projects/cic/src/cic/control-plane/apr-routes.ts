// File: projects/cic/src/cic/control-plane/apr-routes.ts | Date: 2026-06-03 | v1.0.0

import { AutonomousPlanner } from "../../apr/autonomous-planner.js";
import { MultiAgentCoordinator } from "../../apr/multi-agent-coordinator.js";
import { TaskAllocator } from "../../apr/task-allocator.js";
import { SkillGraphStore } from "../../skills/skill-graph-store.js";
import { MemorySubstrate } from "../../../memory/memory-substrate";
import { AprMemoryIntegration } from "./apr-memory-integration.js";
import * as path from "path";

export function registerAprRoutes(router: any) {
  const workspaceRoot = process.cwd();
  const graphPath = path.resolve(workspaceRoot, "projects/cic/skill-graph/graph.json");
  const memoryLedgerPath = path.resolve(workspaceRoot, ".artifacts/memory/ledger.jsonl");
  const skillStore = new SkillGraphStore(graphPath);
  const substrate = new MemorySubstrate({
    store_path: memoryLedgerPath
  });
  const memoryIntegration = new AprMemoryIntegration(substrate);
  const planner = new AutonomousPlanner(workspaceRoot);
  const coordinator = new MultiAgentCoordinator(workspaceRoot);
  const allocator = new TaskAllocator(skillStore);

  router.post("/apr/plan", async (req: any, res: any) => {
    try {
      const dryRun = req.body.dryRun !== false; // defaults to true
      const inputs = planner.loadInputs();

      // Inject memory-based context into planning
      const historyContext = await memoryIntegration.getHistoricalContext();
      const skillRecs = await memoryIntegration.getSkillRecommendations();
      const failurePatterns = await memoryIntegration.getFailurePatterns();

      inputs.memoryTrends = {
        ...inputs.memoryTrends,
        historicalSuccessRate: historyContext.successRate,
        riskFactors: historyContext.riskFactors,
        recommendedApproaches: historyContext.recommendedApproaches
      };

      const plan = planner.plan(inputs);
      
      // Allocate tasks using Skill Graph
      plan.tasks = plan.tasks.map(task => {
        const alloc = allocator.allocate(task);
        if (alloc.status === "assigned") {
          task.status = "assigned";
        }
        return task;
      });

      const episode = coordinator.runLoop(plan, dryRun);
      res.json(episode);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/apr/episodes", (_req: any, res: any) => {
    try {
      res.json(coordinator.getEpisodes());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/apr/episodes/:id", (req: any, res: any) => {
    try {
      const id = req.params.id;
      const episodes = coordinator.getEpisodes();
      const match = episodes.find(e => e.id === id);
      if (!match) {
        return res.status(404).json({ error: `Planning episode '${id}' not found.` });
      }
      res.json(match);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
