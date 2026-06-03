// File: projects/cic/src/cic/control-plane/mee-routes.ts | Date: 2026-06-03 | v1.5.0

import { Router } from "express";
import { MeeTriggerEngine } from "../../mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../mee/mee-synthesizer.js";
import { MeeValidator } from "../../mee/mee-validator.js";
import { MeeProposalStore } from "../../mee/mee-proposal-store.js";
import { AutoEvolutionEngine } from "../../mee/auto-evolution-engine.js";
import { MeeDiffEngine } from "../../mee/mee-diff-engine.js";
import { MeeProposalGraph } from "../../mee/mee-proposal-graph.js";
import { MeeNegotiationAgent } from "../../mee/mee-negotiation-agent.js";
import { MeeNegotiationEngine } from "../../mee/mee-negotiation-engine.js";
import { CkgStore } from "../../ckg/ckg-store.js";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { PhaseProposal, RefactorInsight, MeeRun } from "../../mee/mee-schema.js";
import { SelfRefactorEngine } from "../../mee/self-refactor/self-refactor-engine.js";
import { PlanningEngine } from "../../mee/planning/planning-engine.js";
import { FileMeeRunStore } from "../../mee/mee-run-store.js";
import { MeeRunEngine } from "../../mee/mee-run-engine.js";
import os from "node:os";
import { MeeSafetyEngine } from "../../mee/safety/safety-engine.js";
import { MeeSandboxEngine } from "../../mee/safety/sandbox-engine.js";
import { MeeRollbackEngine } from "../../mee/safety/rollback-engine.js";
import { FileMeeAutonomousJobStore } from "../../mee/mee-autonomous-store.js";
import { MeeAutonomousEngine } from "../../mee/mee-autonomous-engine.js";
import { MeeAutonomousWorker } from "../../mee/mee-autonomous-worker.js";

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
  const negotiationEngine = new MeeNegotiationEngine();
  const selfRefactor = new SelfRefactorEngine();
  const planningEngine = new PlanningEngine();

  const runStore = new FileMeeRunStore(path.join(workspaceRoot, "projects/cic/data/runs"));
  const runEngine = new MeeRunEngine(runStore);

  const safetyEngine = new MeeSafetyEngine();
  const sandboxEngine = new MeeSandboxEngine();
  const rollbackEngine = new MeeRollbackEngine();

  const autonomousJobStore = new FileMeeAutonomousJobStore(path.join(workspaceRoot, "projects/cic/data/jobs"));
  const autonomousEngine = new MeeAutonomousEngine(
    autonomousJobStore,
    planningEngine,
    runEngine,
    safetyEngine,
    sandboxEngine,
    store,
    synth,
    validator,
    rollbackEngine
  );

  const autonomousWorker = new MeeAutonomousWorker(
    autonomousJobStore,
    runEngine,
    autonomousEngine,
    workspaceRoot
  );

  if (process.env.NODE_ENV !== "test") {
    autonomousWorker.start();
  }

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
      
      // 1. Run safety checks
      const safetyReport = safetyEngine.analyze(patchSet.patches);
      store.update(proposal.id, { safetyReport });

      const hasOverride = req.body?.override === true;
      const isSafetyOk = safetyReport.passed || hasOverride;

      if (!isSafetyOk) {
        store.update(proposal.id, {
          status: "rejected",
          validationReport: {
            passed: false,
            compilePassed: false,
            testsPassed: false,
            driftPassed: false,
            errors: [`Safety check failed: Risk level is ${safetyReport.riskLevel}. Issues: ${safetyReport.issues.join("; ")}`],
            issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
          }
        });
        return res.json({
          ok: true,
          data: store.get(proposal.id)
        });
      }
      
      // 2. Run sandbox execution asynchronously
      (async () => {
        const sandboxResult = await sandboxEngine.validate(patchSet.patches);
        store.update(proposal.id, { sandboxResult });

        if (!sandboxResult.passed) {
          store.update(proposal.id, {
            status: "rejected",
            validationReport: {
              passed: false,
              compilePassed: sandboxResult.compilePassed,
              testsPassed: sandboxResult.testsPassed,
              driftPassed: false,
              errors: ["Sandbox build/test failed.", sandboxResult.output],
              issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
            }
          });
          return;
        }

        // 3. Run real validation
        const report = await validator.validateAll(patchSet);
        store.update(proposal.id, {
          status: report.passed ? "validated" : "rejected",
          validationReport: report
        });
      })().catch((err: any) => {
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
    let backupMap: Record<string, string | null> | null = null;
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
      
      // Snapshot state
      backupMap = rollbackEngine.snapshot(patchSet.patches);

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
      if (backupMap) {
        try {
          rollbackEngine.restore(backupMap);
          console.log(`Successfully rolled back after apply failure for proposal ${req.params.id}`);
        } catch (rollErr) {
          console.error("Rollback restore failed:", rollErr);
        }
      }
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to apply patches. Rollback triggered.",
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
          // Safety Check
          const safetyReport = safetyEngine.analyze(node.patchSet.patches);
          store.update(node.id, { safetyReport });

          if (!safetyReport.passed) {
            store.update(node.id, {
              status: "rejected",
              validationReport: {
                passed: false,
                compilePassed: false,
                testsPassed: false,
                driftPassed: false,
                errors: [`Safety check failed: Risk level is ${safetyReport.riskLevel}. Issues: ${safetyReport.issues.join("; ")}`],
                issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
              }
            });
            reports.push({
              id: node.id,
              passed: false,
              issues: safetyReport.issues.map(msg => ({ type: "safety_violation", message: msg }))
            });
            continue;
          }

          // Sandbox Check
          const sandboxResult = await sandboxEngine.validate(node.patchSet.patches);
          store.update(node.id, { sandboxResult });

          if (!sandboxResult.passed) {
            store.update(node.id, {
              status: "rejected",
              validationReport: {
                passed: false,
                compilePassed: sandboxResult.compilePassed,
                testsPassed: sandboxResult.testsPassed,
                driftPassed: false,
                errors: ["Sandbox validation failed."],
                issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
              }
            });
            reports.push({
              id: node.id,
              passed: false,
              issues: [{ type: "sandbox_failure", message: "Sandbox build/test failed." }]
            });
            continue;
          }

          // Real validation
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
      const backups: { id: string; backupMap: Record<string, string | null> }[] = [];
      try {
        for (const node of ordered) {
          if (!node.patchSet) continue;

          // Snapshot state
          const backupMap = rollbackEngine.snapshot(node.patchSet.patches);
          backups.push({ id: node.id, backupMap });

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
      } catch (err: any) {
        console.error("Apply all failed, initiating rollback in reverse order:", err);
        for (let i = backups.length - 1; i >= 0; i--) {
          try {
            rollbackEngine.restore(backups[i].backupMap);
            store.update(backups[i].id, { status: "rejected" });
          } catch (rollErr) {
            console.error(`Rollback restore failed for proposal ${backups[i].id}:`, rollErr);
          }
        }
        throw err;
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

  // --- Phase 30H New Endpoints ---
  router.post("/mee/proposals/negotiate", (req, res) => {
    try {
      const proposals = store.loadAll();
      const agents = proposals.map((p) =>
        new MeeNegotiationAgent(p, synth.synthesize(p))
      );

      negotiationEngine.runUntilStable(agents);
      const consensus = negotiationEngine.produceConsensusPlan(agents);

      res.json({
        ok: true,
        data: {
          consensus,
          transcript: negotiationEngine.getTranscript()
        }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to execute negotiation.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals/negotiation/:id", (req, res) => {
    try {
      const transcript = negotiationEngine.getTranscript().filter(
        (t) => t.agentA === req.params.id || t.agentB === req.params.id
      );

      res.json({
        ok: true,
        data: { transcript }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to load negotiation transcript.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/proposals/consensus", (_req, res) => {
    try {
      const proposals = store.loadAll();
      const agents = proposals.map((p) =>
        new MeeNegotiationAgent(p, synth.synthesize(p))
      );

      const consensus = negotiationEngine.produceConsensusPlan(agents);

      res.json({
        ok: true,
        data: { consensus }
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to build consensus plan.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/refactor/scan", (req, res) => {
    try {
      const mode = req.body?.mode || "repo";
      let files: { path: string; content: string }[] = [];

      if (mode === "inline") {
        files = req.body?.files as { path: string; content: string }[] | undefined || [];
        if (!Array.isArray(files)) {
          return res.status(400).json({
            ok: false,
            error: {
              code: "validation.invalid_payload",
              message: "files array is required in inline mode",
              details: {}
            }
          });
        }
      } else if (mode === "paths") {
        const paths = req.body?.paths as string[] | undefined || [];
        if (!Array.isArray(paths)) {
          return res.status(400).json({
            ok: false,
            error: {
              code: "validation.invalid_payload",
              message: "paths array is required in paths mode",
              details: {}
            }
          });
        }
        for (const p of paths) {
          const fullPath = path.resolve(process.cwd(), p);
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, "utf8");
            const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
            files.push({ path: relativePath, content });
          }
        }
      } else {
        const targetDir = path.resolve(process.cwd(), "projects/cic/src/mee");
        const getFilesRecursively = (dir: string): { path: string; content: string }[] => {
          const results: { path: string; content: string }[] = [];
          if (!fs.existsSync(dir)) return results;
          const list = fs.readdirSync(dir);
          for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
              results.push(...getFilesRecursively(fullPath));
            } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
              const content = fs.readFileSync(fullPath, "utf8");
              const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
              results.push({ path: relativePath, content });
            }
          }
          return results;
        };
        files = getFilesRecursively(targetDir);
      }

      const insights = selfRefactor.scan(files);
      res.json({ ok: true, data: { insights } });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Refactor scan failed.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/refactor/propose", (req, res) => {
    try {
      const insights = req.body?.insights as RefactorInsight[] | undefined;
      if (!insights || !Array.isArray(insights)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "validation.invalid_payload",
            message: "Insights array is required.",
            details: {}
          }
        });
      }

      const plan = selfRefactor.generatePlan(insights);
      const proposal = selfRefactor.toProposal(plan);
      store.add(proposal);

      res.json({ ok: true, data: { proposalId: proposal.id, proposal } });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Refactor proposal generation failed.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/refactor/plan/:id", (req, res) => {
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

      if (!proposal.refactorPlan) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "validation.invalid_proposal",
            message: "Proposal does not contain a refactor plan.",
            details: { id: req.params.id }
          }
        });
      }

      res.json({ ok: true, data: { plan: proposal.refactorPlan } });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve refactor plan.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/plan", (req, res) => {
    try {
      const { request } = req.body;
      if (!request) {
        return res.status(400).json({
          ok: false,
          error: { code: "validation.invalid_payload", message: "request is required" }
        });
      }

      const plan = planningEngine.generatePlan(request);
      const proposals = planningEngine.generateProposals(plan);

      proposals.forEach((p) => store.add(p));

      res.json({
        ok: true,
        data: {
          plan,
          proposalIds: proposals.map((p) => p.id),
        },
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Planning execution failed.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/runs", (req, res) => {
    try {
      const { proposalIds, planId } = req.body || {};
      if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "validation.invalid_payload",
            message: "proposalIds array is required and must not be empty",
            details: {}
          }
        });
      }

      const run = runEngine.createRun({ proposalIds, planId });
      runEngine.startRun(run.id);

      return res.json({ ok: true, data: { run } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to create run.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/runs", (_req, res) => {
    try {
      const runs = runStore.listRuns();
      return res.json({ ok: true, data: { runs } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to list runs.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/runs/:id", (req, res) => {
    try {
      const run = runStore.getRun(req.params.id);
      if (!run) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.run",
            message: "Run not found",
            details: { id: req.params.id }
          }
        });
      }
      const checkpoints = runStore.getCheckpoints(run.id);
      return res.json({ ok: true, data: { run, checkpoints } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve run.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/runs/:id/checkpoint", (req, res) => {
    try {
      const { label, data } = req.body || {};
      const cp = runEngine.checkpoint(req.params.id, label, data || {});
      if (!cp) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.run",
            message: "Run not found",
            details: { id: req.params.id }
          }
        });
      }
      return res.json({ ok: true, data: { checkpoint: cp } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to create checkpoint.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/runs/:id/cancel", (req, res) => {
    try {
      const run = runEngine.cancelRun(req.params.id);
      if (!run) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.run",
            message: "Run not found",
            details: { id: req.params.id }
          }
        });
      }
      return res.json({ ok: true, data: { run } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to cancel run.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/proposals/:id/override", (req, res) => {
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
      if (proposal.safetyReport) {
        proposal.safetyReport.passed = true;
        store.update(proposal.id, { safetyReport: proposal.safetyReport });
      }
      return res.json({ ok: true, data: store.get(proposal.id) });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to override safety check.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/autonomous/jobs", async (req, res) => {
    try {
      const { request } = req.body || {};
      if (!request) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "validation.invalid_payload",
            message: "request is required",
            details: {}
          }
        });
      }

      const job = autonomousEngine.createJob(request);
      const started = autonomousEngine.startJob(job.id);

      return res.json({
        ok: true,
        data: { job: started ?? job }
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to create autonomous job.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs", (_req, res) => {
    try {
      const jobs = autonomousJobStore.list();
      return res.json({ ok: true, data: { jobs } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to list autonomous jobs.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id", (req, res) => {
    try {
      const job = autonomousJobStore.get(req.params.id);
      if (!job) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.job",
            message: "Autonomous job not found",
            details: { id: req.params.id }
          }
        });
      }
      return res.json({ ok: true, data: { job } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve autonomous job.",
          details: {}
        }
      });
    }
  });
}
