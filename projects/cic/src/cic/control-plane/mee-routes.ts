// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.0.0

import { Router } from "express";
import { MeeTriggerEngine } from "../../mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../mee/mee-synthesizer.js";
import { MeeValidator } from "../../mee/mee-validator.js";
import { CkgStore } from "../../ckg/ckg-store.js";
import path from "node:path";
import crypto from "node:crypto";
import { PhaseProposal } from "../../mee/mee-schema.js";

export function registerMeeRoutes(router: Router) {
  const workspaceRoot = process.cwd();
  const graphPath = path.resolve(workspaceRoot, "projects/cic/ckg/graph.json");
  const ckg = new CkgStore(graphPath);
  const trigger = new MeeTriggerEngine(ckg);
  const generator = new MeePhaseGenerator();
  const synth = new MeePatchSynthesizer();
  const validator = new MeeValidator();

  // In-memory list to store proposals
  const proposals: PhaseProposal[] = [];

  router.post("/mee/propose", (req, res) => {
    try {
      const events = trigger.detectTriggers();
      
      const generatedProposals: PhaseProposal[] = [];
      for (const ev of events) {
        const plan = generator.generate(ev);
        const propId = `prop-${crypto.randomUUID()}`;
        const patchSet = synth.synthesize(propId, plan);
        const filesCreated = patchSet.patches.map(p => p.path);
        
        const proposal: PhaseProposal = {
          id: propId,
          title: plan.title,
          triggerId: ev.id,
          status: "pending",
          filesCreated,
          planSummary: `Objectives: ${plan.objectives.join(", ")}; Tasks: ${plan.tasks.join(", ")}`,
          timestamp: Date.now()
        };
        proposals.push(proposal);
        generatedProposals.push(proposal);
      }

      res.json({ events, proposals: generatedProposals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/proposals", (_req, res) => {
    try {
      res.json(proposals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/proposals/:id", (req, res) => {
    try {
      const prop = proposals.find(p => p.id === req.params.id);
      if (!prop) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      res.json(prop);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/mee/validate/:id", (req, res) => {
    try {
      const prop = proposals.find(p => p.id === req.params.id);
      if (!prop) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      const patchSet = { proposalId: req.params.id, patches: [] };
      const report = validator.validate(patchSet);
      if (report.passed) {
        prop.status = "validated";
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/patch/:id", (req, res) => {
    try {
      const prop = proposals.find(p => p.id === req.params.id);
      if (!prop) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      res.json({ proposalId: req.params.id, patches: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
