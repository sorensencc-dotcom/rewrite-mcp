// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.3.0

import { Router } from "express";
import { MeeTriggerEngine } from "../../mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../mee/mee-synthesizer.js";
import { MeeValidator } from "../../mee/mee-validator.js";
import { MeeProposalStore } from "../../mee/mee-proposal-store.js";
import { AutoEvolutionEngine } from "../../mee/auto-evolution-engine.js";
import { MeeDiffEngine } from "../../mee/mee-diff-engine.js";
import { MeeProposalGraph } from "../../mee/mee-proposal-graph.js";
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
  const diffEngine = new MeeDiffEngine();
  const graphEngine = new MeeProposalGraph(synth, validator);

  router.post("/mee/propose", (req, res) => {
    try {
      const events = trigger.detectTriggers();
      const event = events[0] ?? null;
      if (!event) {
        return res.json({
          ok: true,
          data: { events: [], proposals: [], proposal: null }
        });
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
      res.json({
        ok: true,
        data: { events, proposal, plan }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to create proposal.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals", (_req, res) => {
    try {
      res.json({
        ok: true,
        data: store.loadAll()
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to load proposals.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
      }
      res.json({
        ok: true,
        data: proposal
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to load proposal details.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/triggers", (_req, res) => {
    try {
      const events = trigger.detectTriggers();
      res.json({
        ok: true,
        data: { events }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to detect triggers.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/validate/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
      }
      
      const patchSet = synth.synthesize(proposal);
      
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

      res.json({
        ok: true,
        data: store.get(proposal.id)
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to start validation.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/validation/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
      }
      res.json({
        ok: true,
        data: proposal.validationReport || null
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve validation report.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/patch/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
      }
      const patchSet = synth.synthesize(proposal);
      res.json({
        ok: true,
        data: { proposal, patchSet }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to synthesize patches.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/apply/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
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

      res.json({
        ok: true,
        data: { proposal: store.get(proposal.id), patchSet }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to apply patches.",
          details: {}
        }
      });
    }
  });

  // --- Auto-Evolution endpoints ---
  router.get("/mee/auto/status", (_req, res) => {
    try {
      res.json({
        ok: true,
        data: autoEvolution.status()
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve auto-evolution status.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/auto/enable", (req, res) => {
    try {
      const { intervalSeconds, requireApproval } = req.body;
      const intervalMs = (intervalSeconds || 60) * 1000;
      
      autoEvolution.setRequireApproval(requireApproval !== false);
      autoEvolution.enable(intervalMs);
      
      res.json({
        ok: true,
        data: { status: autoEvolution.status() }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to enable auto-evolution.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/auto/disable", (_req, res) => {
    try {
      autoEvolution.disable();
      res.json({
        ok: true,
        data: { status: autoEvolution.status() }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to disable auto-evolution.",
          details: {}
        }
      });
    }
  });

  // --- Phase 30F & 30G New endpoints ---
  router.get("/mee/diff/:id", (req, res) => {
    try {
      const proposal = store.get(req.params.id);
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.proposal",
            message: `Proposal ${req.params.id} not found.`,
            details: { id: req.params.id }
          }
        });
      }
      const patchSet = synth.synthesize(proposal);
      const diffs = patchSet.patches.map((p) => diffEngine.generateDiff(p));
      res.json({
        ok: true,
        data: { proposal, diffs }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to generate diffs.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals/graph", (_req, res) => {
    try {
      const proposals = store.loadAll();
      const graph = graphEngine.buildGraph(proposals);
      const nodesDTO = graph.nodes.map(n => ({
        id: n.id,
        title: n.proposal.title,
        status: n.proposal.status
      }));
      res.json({
        ok: true,
        data: {
          nodes: nodesDTO,
          edges: graph.edges,
          conflicts: graph.conflicts
        }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to build proposals graph.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals/conflicts", (_req, res) => {
    try {
      const proposals = store.loadAll();
      const graph = graphEngine.buildGraph(proposals);
      res.json({
        ok: true,
        data: { conflicts: graph.conflicts }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to load conflicts.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/proposals/validate-all", async (_req, res) => {
    try {
      const proposals = store.loadAll();
      const graph = graphEngine.buildGraph(proposals);

      // Block transaction if conflicts exist
      if (graph.conflicts.length > 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "validation.conflicts",
            message: "Conflicts detected between proposals",
            details: { conflicts: graph.conflicts }
          }
        });
      }

      const ordered = graphEngine.topologicalSort(graph);
      const reports = [];

      // Validate sequentially
      for (const node of ordered) {
        if (node.patchSet) {
          const report = await validator.validateAll(node.patchSet);
          store.update(node.id, {
            status: report.passed ? "validated" : "rejected",
            validationReport: report
          });
          reports.push({
            id: node.id,
            passed: report.passed,
            issues: report.issues || []
          });
        }
      }

      res.json({
        ok: true,
        data: {
          ordered: ordered.map(n => n.id),
          reports
        }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to validate all proposals.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/proposals/apply-all", async (_req, res) => {
    try {
      const proposals = store.loadAll();
      const graph = graphEngine.buildGraph(proposals);

      // Abort entire transaction on conflicts
      if (graph.conflicts.length > 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "apply.conflicts",
            message: "Cannot apply proposals due to unresolved conflicts",
            details: { conflicts: graph.conflicts }
          }
        });
      }

      const ordered = graphEngine.topologicalSort(graph);
      const applied: string[] = [];
      const failed: string[] = [];

      // Validate first sequentially
      for (const node of ordered) {
        if (!node.patchSet) continue;
        const report = await validator.validateAll(node.patchSet);
        if (!report.passed) {
          failed.push(node.id);
        }
      }

      // Abort on validation failures
      if (failed.length > 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "apply.validation_failed",
            message: "One or more proposals failed validation",
            details: { failed }
          }
        });
      }

      // Apply patches
      for (const node of ordered) {
        if (!node.patchSet) continue;
        const created: string[] = [];

        for (const patch of node.patchSet.patches) {
          const full = path.join(process.cwd(), patch.path);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, patch.content, "utf8");
          created.push(patch.path);
        }

        store.update(node.id, {
          status: "applied",
          filesCreated: created
        });

        applied.push(node.id);
      }

      res.json({
        ok: true,
        data: {
          applied,
          skipped: []
        }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to apply all proposals.",
          details: {}
        }
      });
    }
  });
}
