import express, { Request, Response } from "express";
import { PMSTemplateRegistry } from "../../pms/pms.template-registry";

export const router = express.Router();
const pmsRegistry = new PMSTemplateRegistry();
pmsRegistry.load();

router.get("/pms/templates", (req: Request, res: Response) => {
  const templates = [...pmsRegistry["templates"].values()];
  res.json({ templates });
});
