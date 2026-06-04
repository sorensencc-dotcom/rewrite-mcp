// File: projects/cic/tests/mee/mee-consensus.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { MeeConsensusEngine } from "../../src/mee/mee-consensus-engine.js";
import { MeeAgentOrchestrator } from "../../src/mee/mee-agent-orchestrator.js";
import { PlannerAgent } from "../../src/mee/planner-agent.js";
import { RefactorAgent } from "../../src/mee/refactor-agent.js";
import { DocsAgent } from "../../src/mee/docs-agent.js";
import { SafetyAgent } from "../../src/mee/safety-agent.js";
import { PlanningEngine } from "../../src/mee/planning/planning-engine.js";
import { MeeAutonomousEngine } from "../../src/mee/mee-autonomous-engine.js";
import { FileMeeAutonomousJobStore } from "../../src/mee/mee-autonomous-store.js";
import { MeeRunEngine } from "../../src/mee/mee-run-engine.js";
import { FileMeeRunStore } from "../../src/mee/mee-run-store.js";
import { MeeSafetyEngine } from "../../src/mee/safety/safety-engine.js";
import { MeeSandboxEngine } from "../../src/mee/safety/sandbox-engine.js";
import { MeeRollbackEngine } from "../../src/mee/safety/rollback-engine.js";
import { MeePatchSynthesizer } from "../../src/mee/mee-synthesizer.js";
import { MeeValidator } from "../../src/mee/mee-validator.js";
import { MeeProposalStore } from "../../src/mee/mee-proposal-store.js";
import { InMemoryMeeMemoryStore } from "../../src/mee/mee-memory-store.js";

describe("Mee Consensus & Negotiation Subsystem", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-consensus-tests");

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("MeeConsensusEngine", () => {
    it("scores proposal based on critique severity weights", () => {
      const engine = new MeeConsensusEngine();
      const critiques: any[] = [
        { severity: "error", issue: "Failing compile" },
        { severity: "warn", issue: "Line smell" },
        { severity: "info", issue: "Doc smell" }
      ];

      const score = engine.scoreProposal("prop-1", critiques);
      // 100 - 40 (error) - 20 (warn) - 5 (info) = 35
      expect(score.score).toBe(35);
      expect(score.passed).toBe(false);
    });

    it("clamps score to 0 on excessive critiques", () => {
      const engine = new MeeConsensusEngine();
      const critiques: any[] = [
        { severity: "error", issue: "1" },
        { severity: "error", issue: "2" },
        { severity: "error", issue: "3" }
      ];

      const score = engine.scoreProposal("prop-1", critiques);
      expect(score.score).toBe(0);
      expect(score.passed).toBe(false);
    });

    it("determines decisions ready, needs_revision, and blocked correctly", () => {
      const engine = new MeeConsensusEngine(70);

      const r1 = engine.determineResult("prop-1", 80, [], 1, 3);
      expect(r1.decision).toBe("ready");

      const r2 = engine.determineResult("prop-1", 50, [{ severity: "error", issue: "1" }], 1, 3);
      expect(r2.decision).toBe("needs_revision");

      const r3 = engine.determineResult("prop-1", 50, [{ severity: "error", issue: "1" }], 3, 3);
      expect(r3.decision).toBe("blocked");
    });
  });

  describe("Agents", () => {
    it("should critique and refine plan tasks in PlannerAgent", async () => {
      const planning = new PlanningEngine();
      const planner = new PlannerAgent("agent-planner-1", "planner", planning);

      const taskCritique = {
        id: "task-1",
        agentId: "agent-planner-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "critique",
        payload: {
          plan: {
            rootRequest: "Optimize code",
            summary: "Optimization plan",
            tasks: []
          }
        },
        status: "pending" as const
      };

      const resCritique = await planner.handleTask(taskCritique);
      const dataCritique = JSON.parse(resCritique.content);
      expect(dataCritique.critiques.length).toBe(1);
      expect(dataCritique.critiques[0].severity).toBe("error");

      const taskRefine = {
        id: "task-2",
        agentId: "agent-planner-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "refine",
        payload: {
          plan: {
            rootRequest: "Optimize code",
            summary: "Optimization plan",
            tasks: []
          }
        },
        status: "pending" as const
      };

      const resRefine = await planner.handleTask(taskRefine);
      const dataRefine = JSON.parse(resRefine.content);
      expect(dataRefine.refinedPlan.tasks.length).toBe(1);
      expect(dataRefine.refinedPlan.tasks[0].id).toBe("task-refined-1");
    });

    it("should critique and refine patches in RefactorAgent", async () => {
      const refactor = new RefactorAgent("agent-refactor-1");

      const taskCritique = {
        id: "task-3",
        agentId: "agent-refactor-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "critique",
        payload: {
          patches: [
            { path: "src/index.ts", type: "modify" as const, content: "const x = eval('2+2');" }
          ]
        },
        status: "pending" as const
      };

      const resCritique = await refactor.handleTask(taskCritique);
      const dataCritique = JSON.parse(resCritique.content);
      expect(dataCritique.critiques.length).toBeGreaterThan(0);
      expect(dataCritique.critiques[0].severity).toBe("error");

      const taskRefine = {
        id: "task-4",
        agentId: "agent-refactor-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "refine",
        payload: {
          patches: [
            { path: "src/index.ts", type: "modify" as const, content: "const x = eval('2+2');" }
          ],
          critiques: dataCritique.critiques
        },
        status: "pending" as const
      };

      const resRefine = await refactor.handleTask(taskRefine);
      const dataRefine = JSON.parse(resRefine.content);
      expect(dataRefine.refinedPatches[0].content).toContain("JSON.parse");
    });

    it("should critique and refine descriptions in DocsAgent", async () => {
      const docs = new DocsAgent("agent-docs-1");

      const taskCritique = {
        id: "task-5",
        agentId: "agent-docs-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "critique",
        payload: {
          proposal: {
            title: "short",
            planSummary: "brief"
          }
        },
        status: "pending" as const
      };

      const resCritique = await docs.handleTask(taskCritique);
      const dataCritique = JSON.parse(resCritique.content);
      expect(dataCritique.critiques.length).toBe(2);

      const taskRefine = {
        id: "task-6",
        agentId: "agent-docs-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "refine",
        payload: {
          proposal: {
            title: "short",
            planSummary: "brief"
          }
        },
        status: "pending" as const
      };

      const resRefine = await docs.handleTask(taskRefine);
      const dataRefine = JSON.parse(resRefine.content);
      expect(dataRefine.refinedProposal.title).toContain("Refined Proposal");
    });

    it("should critique and refine safety violations in SafetyAgent", async () => {
      const safety = new SafetyAgent("agent-safety-1");

      const taskCritique = {
        id: "task-7",
        agentId: "agent-safety-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "critique",
        payload: {
          patches: [
            { path: "src/safe.ts", type: "modify" as const, content: "child_process.exec('rm -rf');" },
            { path: ".env", type: "modify" as const, content: "SECRET=1" }
          ]
        },
        status: "pending" as const
      };

      const resCritique = await safety.handleTask(taskCritique);
      const dataCritique = JSON.parse(resCritique.content);
      expect(dataCritique.critiques.length).toBe(2);
      expect(dataCritique.critiques[0].severity).toBe("error");

      const taskRefine = {
        id: "task-8",
        agentId: "agent-safety-1",
        jobId: "job-1",
        createdAt: new Date().toISOString(),
        type: "refine",
        payload: {
          patches: [
            { path: "src/safe.ts", type: "modify" as const, content: "child_process.exec('rm -rf');" }
          ]
        },
        status: "pending" as const
      };

      const resRefine = await safety.handleTask(taskRefine);
      const dataRefine = JSON.parse(resRefine.content);
      expect(dataRefine.refinedPatches[0].content).toContain("disabled for safety");
    });
  });

  describe("MeeAutonomousEngine Integration", () => {
    it("should run critique, score consensus, and succeed on clean input", async () => {
      const jobStore = new FileMeeAutonomousJobStore(tempDir);
      const runStore = new FileMeeRunStore(tempDir);
      const proposalStore = new MeeProposalStore();
      (proposalStore as any).filePath = path.join(tempDir, "proposals.json");

      const planning = new PlanningEngine();
      const runs = new MeeRunEngine(runStore);
      const safetyEngine = new MeeSafetyEngine();
      const sandbox = new MeeSandboxEngine({ mockExec: true, mockResult: true });
      const synth = new MeePatchSynthesizer();
      const validator = new MeeValidator();
      const rollback = new MeeRollbackEngine();
      const memoryStore = new InMemoryMeeMemoryStore();
      
      const orchestrator = new MeeAgentOrchestrator(tempDir);
      orchestrator.registerAgent(new PlannerAgent("agent-planner-1", "planner", planning));
      orchestrator.registerAgent(new RefactorAgent("agent-refactor-1"));
      orchestrator.registerAgent(new DocsAgent("agent-docs-1"));
      orchestrator.registerAgent(new SafetyAgent("agent-safety-1"));

      const engine = new MeeAutonomousEngine(
        jobStore,
        planning,
        runs,
        safetyEngine,
        sandbox,
        proposalStore,
        synth,
        validator,
        rollback,
        undefined, // failureStore
        undefined, // selfHealing
        undefined, // healingPlanStore
        memoryStore,
        orchestrator
      );

      const job = engine.createJob("Verify workspace configurations");
      await engine.startJob(job.id);

      // Add a clean proposal
      const proposalId = job.proposalIds[0];
      const p = proposalStore.get(proposalId);
      expect(p).toBeDefined();

      if (p) {
        p.title = "Perfect Implementation Spec";
        p.planSummary = "Expanded plan summary to verify consensus gating passes without errors.";
        proposalStore.update(proposalId, p);

        // Run executeStep
        await engine.executeStep(job.id, proposalId, tempDir);

        // Verify job consensus persisted results
        const consensusResults = orchestrator.getConsensusForJob(job.id, job.proposalIds);
        expect(consensusResults.length).toBeGreaterThan(0);
        expect(consensusResults[0].decision).toBe("ready");
        expect(consensusResults[0].score).toBe(100);

        // Verify memory item logged
        const memories = memoryStore.queryByJob(job.id);
        expect(memories.some(m => m.tags.includes("consensus"))).toBe(true);
      }
    });

    it("should run refinement when critiques are raised, and succeed if refined patches pass", async () => {
      const jobStore = new FileMeeAutonomousJobStore(tempDir);
      const runStore = new FileMeeRunStore(tempDir);
      const proposalStore = new MeeProposalStore();
      (proposalStore as any).filePath = path.join(tempDir, "proposals.json");

      const planning = new PlanningEngine();
      const runs = new MeeRunEngine(runStore);
      const safetyEngine = new MeeSafetyEngine();
      const sandbox = new MeeSandboxEngine({ mockExec: true, mockResult: true });
      const synth = new MeePatchSynthesizer();
      const validator = new MeeValidator();
      const rollback = new MeeRollbackEngine();
      const memoryStore = new InMemoryMeeMemoryStore();
      
      const orchestrator = new MeeAgentOrchestrator(tempDir);
      orchestrator.registerAgent(new PlannerAgent("agent-planner-1", "planner", planning));
      orchestrator.registerAgent(new RefactorAgent("agent-refactor-1"));
      orchestrator.registerAgent(new DocsAgent("agent-docs-1"));
      orchestrator.registerAgent(new SafetyAgent("agent-safety-1"));

      const engine = new MeeAutonomousEngine(
        jobStore,
        planning,
        runs,
        safetyEngine,
        sandbox,
        proposalStore,
        synth,
        validator,
        rollback,
        undefined, // failureStore
        undefined, // selfHealing
        undefined, // healingPlanStore
        memoryStore,
        orchestrator
      );

      // Create job
      const job = engine.createJob("Verify config");
      await engine.startJob(job.id);

      const proposalId = job.proposalIds[0];
      const p = proposalStore.get(proposalId);
      expect(p).toBeDefined();

      if (p) {
        // Trigger critiques: short title (warn), short summary (warn)
        p.title = "Short";
        p.planSummary = "Short";
        proposalStore.update(proposalId, p);

        // Run executeStep - should run refinement and succeed
        await engine.executeStep(job.id, proposalId, tempDir);

        const consensusResults = orchestrator.getConsensusForJob(job.id, job.proposalIds);
        expect(consensusResults.length).toBeGreaterThan(0);
        // First round should be needs_revision
        expect(consensusResults.some(r => r.decision === "needs_revision")).toBe(true);
        // Final round should be ready
        expect(consensusResults[consensusResults.length - 1].decision).toBe("ready");

        // Verify memory item logged refinement
        const memories = memoryStore.queryByJob(job.id);
        expect(memories.some(m => m.tags.includes("refinement"))).toBe(true);
      }
    });
  });
});
