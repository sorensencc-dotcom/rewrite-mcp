// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.0.0

import { Router } from "express";
import { MeeTriggerEngine } from "../../mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../mee/mee-synthesizer.js";
import { MeeValidator } from "../../mee/mee-validator.js";
import { MeeProposalStore } from "../../mee/mee-proposal-store.js";
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
  const store = new MeeProposalStore();

  router.post("/mee/propose", (req, res) => {
    try {
      const events = trigger.detectTriggers();
      const event = events[0] ?? null;
      if (!event) {
        return res.json({ events: [], proposals: [] });
      }

      const plan = generator.generate(event);
      const propId = `prop-${crypto.randomUUID()}`;
      const patchSet = synth.synthesize(propId, plan);
      const filesCreated = patchSet.patches.map(p => p.path);

      const proposal: PhaseProposal = {
        id: propId,
        title: plan.title,
        triggerId: event.id,
        status: "pending",
        filesCreated,
        planSummary: plan.objectives.join("; "),
        timestamp: Date.now()
      };

      store.add(proposal);
      res.json({ events, proposals: [proposal] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/proposals", (_req, res) => {
    try {
      res.json(store.loadAll());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/proposals/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      res.json(proposal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/mee/validate/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      
      const patchSet = { proposalId: proposal.id, patches: [] };
      const report = validator.validate(patchSet);
      
      store.update(proposal.id, {
        status: report.passed ? "validated" : "rejected"
      });

      res.json(store.get(proposal.id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/patch/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      res.json({ proposalId: req.params.id, patches: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/mee/apply/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      store.update(proposal.id, {
        status: "applied"
      });
      res.json(store.get(proposal.id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
