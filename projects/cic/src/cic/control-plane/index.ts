import express, { Request, Response } from "express";
import { PMSTemplateRegistry } from "../../pms/pms.template-registry.js";
import { orchestrator } from "../../rtk/automation/orchestrator.js";

export const router = express.Router();
const pmsRegistry = new PMSTemplateRegistry();
pmsRegistry.load();

router.get("/pms/templates", (req: Request, res: Response) => {
  const templates = [...pmsRegistry["templates"].values()];
  res.json({ templates });
});

router.get("/rtk/automation/state", (req: Request, res: Response) => {
  res.json(orchestrator.getStateTracker().getState());
});
