// File: projects/cic/src/cic/control-plane/skills-routes.ts | Date: 2026-06-03 | v1.0.0

import { SkillGraphStore } from "../../skills/skill-graph-store.js";
import { SkillHarvester } from "../../skills/skill-harvester.js";
import { SkillSynthesizer } from "../../skills/skill-synthesizer.js";
import { SkillDoctrineSync, ExternalSkillMapping } from "../../skills/skill-doctrine-sync.js";
import path from "node:path";

export function registerSkillsRoutes(router: any) {
  const graphPath = path.resolve(process.cwd(), "projects/cic/skill-graph/graph.json");
  const store = new SkillGraphStore(graphPath);
  const harvester = new SkillHarvester(process.cwd(), store);
  const synthesizer = new SkillSynthesizer(store);

  // Mock mapping storage for doctrine sync
  const defaultMappings: ExternalSkillMapping[] = [
    {
      cicSkillId: "skill:custom/semantic_seed.yaml",
      claudeSkillId: "claude-skill-1",
      copilotSkillId: "copilot-task-1",
      antigravityLaneId: "antigravity-lane-1"
    }
  ];
  const docSync = new SkillDoctrineSync(store, defaultMappings);

  router.get("/skills/graph", (_req: any, res: any) => {
    try {
      res.json(store.load());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/skills/nodes", (_req: any, res: any) => {
    try {
      const graph = store.load();
      res.json(graph.nodes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/skills/edges", (_req: any, res: any) => {
    try {
      const graph = store.load();
      res.json(graph.edges);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/skills/hotspots", (_req: any, res: any) => {
    try {
      const graph = store.load();
      res.json(graph.meta?.hotspots || { orphanSkills: [], unusedAgents: [], denseNodes: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/skills/drift", (_req: any, res: any) => {
    try {
      res.json(docSync.computeDrift());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/skills/harvest", (_req: any, res: any) => {
    try {
      harvester.run();
      synthesizer.run();
      res.json({ ok: true, graph: store.load() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
