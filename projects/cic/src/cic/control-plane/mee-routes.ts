// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.2.0

import { Router } from "express";
import { MeeTriggerEngine } from "../../mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../mee/mee-synthesizer.js";
import { MeeValidator } from "../../mee/mee-validator.js";
import { MeeProposalStore } from "../../mee/mee-proposal-store.js";
import { AutoEvolutionEngine } from "../../mee/auto-evolution-engine.js";
import { CkgStore } from "../../ckg/ckg-store.js";
import path from "node:path";
import fs from "node:fs";
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
  const autoEvolution = new AutoEvolutionEngine(trigger, generator, synth, validator, store);

  router.post("/mee/propose", (req, res) => {
    try {
      const events = trigger.detectTriggers();
      const event = events[0] ?? null;
      if (!event) {
        return res.json({ events: [], proposals: [], proposal: null });
      }

      const plan = generator.generate(event);
      const propId = `prop-${crypto.randomUUID()}`;
      const patchSet = synth.synthesize({
        id: propId,
        title: plan.title,
        trigger: event,
        status: "pending",
        filesCreated: [],
        planSummary: plan.objectives.join("; "),
        timestamp: Date.now()
      });
      const filesCreated = patchSet.patches.map(p => p.path);

      const proposal: PhaseProposal = {
        id: propId,
        title: plan.title,
        trigger: event,
        status: "pending",
        filesCreated,
        planSummary: plan.objectives.join("; "),
        timestamp: Date.now()
      };

      store.add(proposal);
      res.json({ events, proposal, plan });
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

  router.get("/mee/triggers", (_req, res) => {
    try {
      const events = trigger.detectTriggers();
      res.json({ events });
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
      
      const patchSet = synth.synthesize(proposal);
      
      // Asynchronously trigger validation
      validator.validateAll(patchSet).then((report) => {
        store.update(proposal.id, {
          status: report.passed ? "validated" : "rejected",
          validationReport: report
        });
      }).catch((err: any) => {
        console.error("Async validation failed:", err);
        store.update(proposal.id, {
          status: "rejected",
          validationReport: {
            passed: false,
            compilePassed: false,
            testsPassed: false,
            driftPassed: false,
            errors: [err.message || "Validation failed."],
            issues: [{ type: "error", message: err.message || "Validation failed." }]
          }
        });
      });

      res.json(store.get(proposal.id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/mee/validation/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: `Proposal ${req.params.id} not found.` });
      }
      res.json(proposal.validationReport || null);
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
      const patchSet = synth.synthesize(proposal);
      res.json({ proposal, patchSet });
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

      const patchSet = synth.synthesize(proposal);
      const created: string[] = [];

      for (const patch of patchSet.patches) {
        const full = path.join(process.cwd(), patch.path);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, patch.content, "utf8");
        created.push(patch.path);
      }

      store.update(proposal.id, {
        status: "applied",
        filesCreated: created
      });

      res.json({ proposal: store.get(proposal.id), patchSet });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Auto-Evolution endpoints ---
  router.get("/mee/auto/status", (_req, res) => {
    try {
      res.json(autoEvolution.status());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/mee/auto/enable", (req, res) => {
    try {
      const { intervalSeconds, requireApproval } = req.body;
      const intervalMs = (intervalSeconds || 60) * 1000;
      
      autoEvolution.setRequireApproval(requireApproval !== false);
      autoEvolution.enable(intervalMs);
      
      res.json({ ok: true, status: autoEvolution.status() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/mee/auto/disable", (_req, res) => {
    try {
      autoEvolution.disable();
      res.json({ ok: true, status: autoEvolution.status() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
