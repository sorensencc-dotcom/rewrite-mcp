// File: projects/cic/src/cic/control-plane/cro-routes.ts | Date: 2026-06-03 | v1.0.0

import { RuntimeExecutor } from "../../cro/runtime-executor.js";
import { TaskExecution } from "../../cro/types.js";

export function registerCroRoutes(router: any) {
  const workspaceRoot = process.cwd();
  const executor = new RuntimeExecutor(workspaceRoot);

  router.post("/cro/execute", async (req: any, res: any) => {
    try {
      const dryRun = req.body.dryRun !== false; // defaults to true
      const tasksPayload = req.body.tasks || [];

      if (!Array.isArray(tasksPayload) || tasksPayload.length === 0) {
        return res.status(400).json({ error: "Missing or invalid parameter: tasks must be a non-empty array." });
      }

      // Map payload to TaskExecution instances
      const tasks: TaskExecution[] = tasksPayload.map((t: any) => ({
        taskId: t.taskId || `task_${Math.random().toString(36).substring(2, 9)}`,
        goalId: t.goalId || "goal_default",
        title: t.title || "Default Task",
        status: "pending",
        owner: t.owner || "agent:RedesignAgent",
        retryCount: 0
      }));

      const episode = await executor.runBatch(tasks, dryRun);
      res.json(episode);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/cro/episodes", (_req: any, res: any) => {
    try {
      res.json(executor.getEpisodes());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/cro/episodes/:id", (req: any, res: any) => {
    try {
      const id = req.params.id;
      const episodes = executor.getEpisodes();
      const match = episodes.find(e => e.id === id);
      if (!match) {
        return res.status(404).json({ error: `Execution episode '${id}' not found.` });
      }
      res.json(match);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
