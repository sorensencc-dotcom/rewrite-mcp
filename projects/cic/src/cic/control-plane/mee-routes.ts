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
import { FileMeeAutonomousJobStore, FileMeeRunFailureContextStore, FileMeeHealingPlanStore } from "../../mee/mee-autonomous-store.js";
import { MeeAutonomousEngine } from "../../mee/mee-autonomous-engine.js";
import { MeeAutonomousWorker } from "../../mee/mee-autonomous-worker.js";
import { SelfHealingEngine } from "../../mee/self-healing/self-healing-engine.js";
import { MeeKnowledgeGraph } from "../../mee/mee-kg.js";
import { MeeScheduler } from "../../mee/mee-scheduler.js";
import { LLMPlanningEngine } from "../../mee/planning/llm-planning-engine.js";
// @ts-ignore
import { createLlamaClient } from "../../../ingestion/src/clients/llamaClient.js";
import { FileMeeMemoryStore } from "../../mee/mee-memory-store.js";
import { MeeAgentOrchestrator } from "../../mee/mee-agent-orchestrator.js";
import { PlannerAgent } from "../../mee/planner-agent.js";
import { RefactorAgent } from "../../mee/refactor-agent.js";
import { DocsAgent } from "../../mee/docs-agent.js";
import { SafetyAgent } from "../../mee/safety-agent.js";
import { FileMeePhaseSpecStore } from "../../mee/mee-phase-spec-store.js";
import { MeePhaseGeneratorEngine } from "../../mee/mee-phase-generator-engine.js";
import { ResearchAgent } from "../../mee/research-agent.js";
import { MeeArchitectureRefactorEngine } from "../../mee/mee-architecture-refactor-engine.js";
import { MeeCapabilityExpansionEngine } from "../../mee/mee-capability-expansion-engine.js";

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

  const llama = createLlamaClient();
  const llmClient = {
    async generatePlan(input: {
      request: string;
      repoSummary?: string;
      recentFailures?: string;
    }) {
      const prompt = `You are a planning agent for Cast Iron Charlie.
User Request: ${input.request}
Repository Summary: ${input.repoSummary || "N/A"}
Recent Failures: ${input.recentFailures || "N/A"}

Generate a plan tree consisting of tasks. Each task should have id, title, description, type, and dependsOn (array of dependency task ids).
Return the result strictly in this JSON format:
{
  "rootRequest": "${input.request}",
  "summary": "A short summary of the plan",
  "tasks": [
    {
      "id": "task-1",
      "title": "Create schema file",
      "description": "Define the types and interfaces for the new feature",
      "type": "feature",
      "dependsOn": []
    }
  ]
}
JSON:`;

      try {
        const res = await llama.complete({
          model: "local-llama",
          prompt,
          max_tokens: 1024
        });
        const match = res.text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (err) {
        console.error("LLM planning failed:", err);
      }

      return {
        rootRequest: input.request,
        summary: `Failed to generate LLM plan. Falling back.`,
        tasks: []
      };
    }
  };

  const healingLLMClient = {
    async suggestHealing(input: {
      request: string;
      plan: any;
      failure: any;
    }) {
      const prompt = `You are a self-healing assistant for Cast Iron Charlie.
Original Request: ${input.request}
Failure Message: ${input.failure.errorMessage}
Error Code: ${input.failure.errorCode}
Failing Proposal IDs: ${input.failure.failingProposalIds.join(", ")}
Sandbox Output: ${JSON.stringify(input.failure.sandboxOutput)}

Suggest a healing plan with a summary and a list of suggested tasks to fix this.
Return the result strictly in this JSON format:
{
  "summary": "Short summary of what went wrong and how to fix it",
  "tasks": [
    {
      "title": "Fix target function signature",
      "description": "Adjust the function parameters to match the new schema",
      "type": "fix"
    }
  ]
}
JSON:`;

      try {
        const res = await llama.complete({
          model: "local-llama",
          prompt,
          max_tokens: 1024
        });
        const match = res.text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (err) {
        console.error("LLM healing suggestion failed:", err);
      }

      return {
        summary: `Self-healing plan for failure: ${input.failure.errorMessage}`,
        tasks: [{ title: "Manual Review Needed", description: "Review the failure and fix it manually", type: "fix" }]
      };
    }
  };

  const selfHealing = new SelfHealingEngine(healingLLMClient);
  const llmPlanning = new LLMPlanningEngine(llmClient);

  const planningEngine = new PlanningEngine("deterministic", llmPlanning);

  const runStore = new FileMeeRunStore(path.join(workspaceRoot, "projects/cic/data/runs"));
  const runEngine = new MeeRunEngine(runStore);

  const safetyEngine = new MeeSafetyEngine();
  const sandboxEngine = new MeeSandboxEngine();
  const rollbackEngine = new MeeRollbackEngine();

  const autonomousJobStore = new FileMeeAutonomousJobStore(path.join(workspaceRoot, "projects/cic/data/jobs"));
  const failureContextStore = new FileMeeRunFailureContextStore(path.join(workspaceRoot, "projects/cic/data/failures"));
  const healingPlanStore = new FileMeeHealingPlanStore(path.join(workspaceRoot, "projects/cic/data/healing-plans"));
  const memoryStore = new FileMeeMemoryStore(path.join(workspaceRoot, "projects/cic/data/memory"));
  const orchestrator = new MeeAgentOrchestrator(path.join(workspaceRoot, "projects/cic/data/orchestrator"));
  const plannerAgent = new PlannerAgent("agent-planner-1", "planner", planningEngine);
  const refactorAgent = new RefactorAgent("agent-refactor-1", "refactor");
  const docsAgent = new DocsAgent("agent-docs-1", "docs");
  const safetyAgent = new SafetyAgent("agent-safety-1", "safety");
  const researchAgent = new ResearchAgent("agent-research-1", "research");
  
  orchestrator.registerAgent(plannerAgent);
  orchestrator.registerAgent(refactorAgent);
  orchestrator.registerAgent(docsAgent);
  orchestrator.registerAgent(safetyAgent);
  orchestrator.registerAgent(researchAgent);

  const phaseSpecStore = new FileMeePhaseSpecStore(workspaceRoot);
  const phaseGeneratorEngine = new MeePhaseGeneratorEngine();
  const refactorEngine = new MeeArchitectureRefactorEngine();
  const expansionEngine = new MeeCapabilityExpansionEngine();

  const kg = new MeeKnowledgeGraph(ckg);

  const autonomousEngine = new MeeAutonomousEngine(
    autonomousJobStore,
    planningEngine,
    runEngine,
    safetyEngine,
    sandboxEngine,
    store,
    synth,
    validator,
    rollbackEngine,
    failureContextStore,
    selfHealing,
    healingPlanStore,
    memoryStore,
    orchestrator,
    kg
  );

  const autonomousScheduler = new MeeScheduler(
    autonomousJobStore,
    runEngine,
    autonomousEngine,
    workspaceRoot,
    2 // concurrencyLimit
  );

  if (process.env.NODE_ENV !== "test") {
    autonomousScheduler.start();
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
      const { request, planningMode, priority, dependsOnJobIds } = req.body;
      if (!request) {
        return res.status(400).json({
          ok: false,
          error: { message: "Missing request parameter" }
        });
      }
      const job = autonomousEngine.createJob(request, planningMode);
      job.priority = priority !== undefined ? Number(priority) : 0;
      job.dependsOnJobIds = dependsOnJobIds || [];
      autonomousJobStore.save(job);

      res.json({
        ok: true,
        data: { job }
      });
    } catch (err: any) {
      res.status(500).json({
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

  router.get("/mee/autonomous/jobs/:id/healing-plan", (req, res) => {
    try {
      const plan = healingPlanStore.getByParentJob(req.params.id);
      if (!plan) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.healing_plan",
            message: "No healing plan found",
            details: { id: req.params.id }
          }
        });
      }
      return res.json({ ok: true, data: { plan } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve healing plan.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id/failure-context", (req, res) => {
    try {
      const failure = failureContextStore.getByJob(req.params.id);
      if (!failure) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.failure_context",
            message: "No failure context found",
            details: { id: req.params.id }
          }
        });
      }
      return res.json({ ok: true, data: { failure } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve failure context.",
          details: {}
        }
      });
    }
  });

  router.post("/mee/autonomous/jobs/:id/healing/start", async (req, res) => {
    try {
      const plan = healingPlanStore.getByParentJob(req.params.id);
      if (!plan) {
        return res.status(404).json({
          ok: false,
          error: {
            code: "not_found.healing_plan",
            message: "No healing plan found to trigger healing.",
            details: { id: req.params.id }
          }
        });
      }

      const job = autonomousEngine.createJob(plan.summary);
      job.parentJobId = req.params.id;
      autonomousJobStore.save(job);

      const started = await autonomousEngine.startJob(job.id);

      return res.json({ ok: true, data: { job: started || job } });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to start healing job.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id/agents", (req, res) => {
    try {
      const jobId = req.params.id;
      const tasks = orchestrator.getTasksForJob(jobId);
      const exchanges = orchestrator.getExchangesForJob(jobId);
      return res.json({
        ok: true,
        data: { tasks, exchanges }
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve job agents info.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id/memory", (req, res) => {
    try {
      const jobId = req.params.id;
      const items = memoryStore.queryByJob(jobId);
      return res.json({
        ok: true,
        data: { items }
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve job memory items.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id/consensus", (req, res) => {
    try {
      const jobId = req.params.id;
      const job = autonomousJobStore.get(jobId);
      if (!job) {
        return res.status(404).json({
          ok: false,
          error: { message: "Job not found" }
        });
      }
      const consensus = orchestrator.getConsensusForJob(jobId, job.proposalIds);
      return res.json({
        ok: true,
        data: { consensus }
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve job consensus.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/jobs/:id/kg", (req, res) => {
    try {
      const graph = kg.getGraph();
      return res.json({
        ok: true,
        data: { graph }
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve knowledge graph.",
          details: {}
        }
      });
    }
  });

  router.get("/mee/autonomous/scheduler/status", (_req, res) => {
    try {
      const status = autonomousScheduler.getQueueState();
      return res.json({
        ok: true,
        data: status
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "internal.exception",
          message: err.message || "Failed to retrieve scheduler status.",
          details: {}
        }
      });
    }
  });

  // --- Phase 43: Autonomous Phase Generation (APG) ---
  router.get("/mee/phases", (_req, res) => {
    try {
      res.json({ ok: true, data: phaseSpecStore.loadAll() });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/phases/generate", async (req, res) => {
    try {
      const gaps = trigger.detectTriggers();
      const findings = gaps.map((gap) => ({
        id: `finding-${crypto.randomUUID()}`,
        title: `Research Discovery: ${gap.type}`,
        description: `Discovered discrepancies in CKG: ${JSON.stringify(gap.payload)}`,
        evidence: [gap.id],
        severity: "high" as const,
        category: "gap" as const,
        timestamp: Date.now()
      }));

      if (findings.length === 0) {
        findings.push({
          id: `finding-${crypto.randomUUID()}`,
          title: "Research Discovery: Codebase Verification",
          description: "Routine verification audit has flagged component test density optimizations.",
          evidence: [],
          severity: "low" as const,
          category: "opportunity" as const,
          timestamp: Date.now()
        });
      }

      const activePhases = phaseSpecStore.loadAll();
      const nextPhaseNumber = Math.max(42, ...activePhases.map((p) => p.phaseNumber)) + 1;

      const spec = phaseGeneratorEngine.generatePhaseSpec(findings, nextPhaseNumber);
      phaseSpecStore.add(spec);

      const consensusResult = await phaseGeneratorEngine.runValidationRound(spec, orchestrator, `job-spec-${crypto.randomUUID()}`);
      
      res.json({ ok: true, data: { spec, consensusResult } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/phases/:id/approve", async (req, res) => {
    try {
      const phase = phaseSpecStore.get(req.params.id);
      if (!phase) {
        return res.status(404).json({ ok: false, error: { message: "Phase spec not found" } });
      }
      phaseSpecStore.update(phase.id, { status: "approved" });

      const requestText = `Implement objectives for Phase ${phase.phaseNumber}: ${phase.title}. Objectives: ${phase.objectives.join("; ")}`;
      const job = autonomousEngine.createJob(requestText, "hybrid");
      await autonomousEngine.startJob(job.id);

      res.json({ ok: true, data: { phase: phaseSpecStore.get(phase.id), job } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/phases/:id/reject", (req, res) => {
    try {
      const phase = phaseSpecStore.get(req.params.id);
      if (!phase) {
        return res.status(404).json({ ok: false, error: { message: "Phase spec not found" } });
      }
      phaseSpecStore.update(phase.id, { status: "rejected" });
      res.json({ ok: true, data: phaseSpecStore.get(phase.id) });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  // --- Phase 44: Autonomous Architecture Refactoring (AAR) ---
  router.get("/mee/refactor/opportunities", (_req, res) => {
    try {
      const opps = refactorEngine.scan(kg);
      res.json({ ok: true, data: { opportunities: opps } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/refactor/propose", (req, res) => {
    try {
      const { opportunity } = req.body;
      if (!opportunity) {
        return res.status(400).json({ ok: false, error: { message: "Opportunity is required" } });
      }
      const proposal = refactorEngine.proposeRefactor(opportunity);
      store.add(proposal);
      res.json({ ok: true, data: { proposal } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/refactor/apply", async (req, res) => {
    try {
      const { proposalId } = req.body;
      const proposal = store.get(proposalId);
      if (!proposal) {
        return res.status(404).json({ ok: false, error: { message: "Proposal not found" } });
      }
      await refactorEngine.applyRefactorPatch(proposal, workspaceRoot);

      proposal.status = "applied";
      store.update(proposal.id, { status: "applied" });

      res.json({ ok: true, data: { proposal } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  // --- Phase 45: Autonomous Capability Expansion (ACE) ---
  router.get("/mee/expansion/specs", (_req, res) => {
    try {
      const specs = expansionEngine.detectGaps(kg);
      res.json({ ok: true, data: { specs } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/expansion/propose", (req, res) => {
    try {
      const { spec } = req.body;
      if (!spec) {
        return res.status(400).json({ ok: false, error: { message: "Capability spec is required" } });
      }
      const proposal = expansionEngine.generateProposal(spec);
      store.add(proposal);
      res.json({ ok: true, data: { proposal } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });

  router.post("/mee/expansion/apply", async (req, res) => {
    try {
      const { spec } = req.body;
      if (!spec) {
        return res.status(400).json({ ok: false, error: { message: "Capability spec is required" } });
      }
      await expansionEngine.applyExpansion(spec, kg, workspaceRoot);
      res.json({ ok: true, data: { spec } });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: { message: err.message } });
    }
  });
}
