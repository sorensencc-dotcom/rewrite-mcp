// File: projects/cic/src/cic/control-plane/ckg-routes.ts | Date: 2026-06-03 | v1.0.0

import { CkgStore } from "../../ckg/ckg-store.js";
import { CkgHarvester } from "../../ckg/ckg-harvester.js";
import { CkgSynthesizer } from "../../ckg/ckg-synthesizer.js";
import path from "node:path";

export function registerCkgRoutes(router: any) {
  const workspaceRoot = process.cwd();
  const graphPath = path.resolve(workspaceRoot, "projects/cic/ckg/graph.json");
  const store = new CkgStore(graphPath);
  const harvester = new CkgHarvester(workspaceRoot, store);
  const synthesizer = new CkgSynthesizer(store);

  router.get("/ckg/graph", (_req: any, res: any) => {
    try {
      res.json(store.load());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ckg/nodes", (req: any, res: any) => {
    try {
      const type = req.query.type;
      const tag = req.query.tag;
      let graph = store.load();
      let nodes = graph.nodes;
      if (type) {
        nodes = nodes.filter(n => n.type === type);
      }
      if (tag) {
        nodes = nodes.filter(n => n.tags?.includes(tag));
      }
      res.json(nodes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ckg/edges", (req: any, res: any) => {
    try {
      const type = req.query.type;
      const from = req.query.from;
      const to = req.query.to;
      let graph = store.load();
      let edges = graph.edges;
      if (type) {
        edges = edges.filter(e => e.type === type);
      }
      if (from) {
        edges = edges.filter(e => e.from === from);
      }
      if (to) {
        edges = edges.filter(e => e.to === to);
      }
      res.json(edges);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ckg/neighborhood/:id", (req: any, res: any) => {
    try {
      const id = req.params.id;
      const depth = req.query.depth ? parseInt(req.query.depth, 10) : 2;
      res.json(store.getNeighborhood(id, depth));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ckg/hotspots", (_req: any, res: any) => {
    try {
      const graph = store.load();
      res.json(graph.meta?.hotspots || { centralNodes: [], orphans: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/ckg/drift", (_req: any, res: any) => {
    try {
      const graph = store.load();
      res.json(graph.meta?.drift || { unmappedSkills: [], stateDiscrepancies: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/ckg/harvest", (_req: any, res: any) => {
    try {
      harvester.run();
      synthesizer.run();
      res.json({ ok: true, graph: store.load() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
