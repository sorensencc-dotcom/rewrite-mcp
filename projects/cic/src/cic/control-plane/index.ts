import express, { Request, Response } from "express";
import { PMSTemplateRegistry } from "../../pms/pms.template-registry.js";
import { orchestrator } from "../../rtk/automation/orchestrator.js";
import { VectorIndex } from "../../indexer/vector-index.js";
import { graphBuilder } from "../../linking/graph-builder.js";
import { entityResolver } from "../../linking/entity-resolver.js";
import { pmsComposer } from "../../pms/v2/composer.js";

export const router = express.Router();
const pmsRegistry = new PMSTemplateRegistry();
pmsRegistry.load();

const vectorIndex = new VectorIndex();

router.get("/pms/templates", (req: Request, res: Response) => {
  const templates = [...pmsRegistry["templates"].values()];
  res.json({ templates });
});

router.post("/pms/resolve", async (req: Request, res: Response) => {
  try {
    const { templateId, vars } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: "Missing required parameter: templateId" });
    }
    const resolved = await pmsComposer.resolve(templateId, vars || {});
    res.json(resolved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rtk/automation/state", (req: Request, res: Response) => {
  res.json(orchestrator.getStateTracker().getState());
});

router.get("/index/health", async (req: Request, res: Response) => {
  try {
    const health = await vectorIndex.getHealth();
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/index/search", async (req: Request, res: Response) => {
  try {
    const { query, limit, top_k } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing required parameter: query" });
    }
    const finalLimit = top_k !== undefined ? Number(top_k) : (limit !== undefined ? Number(limit) : undefined);
    const results = await vectorIndex.searchSemantic(query, finalLimit);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/graph/entity/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const neighborhood = graphBuilder.getEntityNeighborhood(id as string);
    res.json(neighborhood);
  } catch (err: any) {
    if (err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/graph/document/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const neighborhood = graphBuilder.getDocumentNeighborhood(id as string);
    res.json(neighborhood);
  } catch (err: any) {
    if (err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});


router.get("/graph/summary", (req: Request, res: Response) => {
  try {
    const summary = graphBuilder.getSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

