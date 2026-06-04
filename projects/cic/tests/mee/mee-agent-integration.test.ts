// File: projects/cic/tests/mee/mee-agent-integration.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MeeAutonomousEngine } from "../../src/mee/mee-autonomous-engine.js";
import { FileMeeAutonomousJobStore } from "../../src/mee/mee-autonomous-store.js";
import { MeeAutonomousWorker } from "../../src/mee/mee-autonomous-worker.js";
import { PlanningEngine } from "../../src/mee/planning/planning-engine.js";
import { MeeRunEngine } from "../../src/mee/mee-run-engine.js";
import { FileMeeRunStore } from "../../src/mee/mee-run-store.js";
import { MeeSafetyEngine } from "../../src/mee/safety/safety-engine.js";
import { MeeSandboxEngine } from "../../src/mee/safety/sandbox-engine.js";
import { MeeRollbackEngine } from "../../src/mee/safety/rollback-engine.js";
import { MeePatchSynthesizer } from "../../src/mee/mee-synthesizer.js";
import { MeeValidator } from "../../src/mee/mee-validator.js";
import { MeeProposalStore } from "../../src/mee/mee-proposal-store.js";
import { InMemoryMeeMemoryStore } from "../../src/mee/mee-memory-store.js";
import { MeeAgentOrchestrator } from "../../src/mee/mee-agent-orchestrator.js";
import { PlannerAgent } from "../../src/mee/planner-agent.js";
import fs from "node:fs";
import path from "node:path";

describe("Mee Autonomous Agent Integration", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-agent-integration-tests");
  let jobStore: FileMeeAutonomousJobStore;
  let runStore: FileMeeRunStore;
  let proposalStore: MeeProposalStore;
  let planning: PlanningEngine;
  let runs: MeeRunEngine;
  let safety: MeeSafetyEngine;
  let sandbox: MeeSandboxEngine;
  let synth: MeePatchSynthesizer;
  let validator: MeeValidator;
  let rollback: MeeRollbackEngine;
  let memoryStore: InMemoryMeeMemoryStore;
  let orchestrator: MeeAgentOrchestrator;
  let engine: MeeAutonomousEngine;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    jobStore = new FileMeeAutonomousJobStore(tempDir);
    runStore = new FileMeeRunStore(tempDir);
    
    proposalStore = new MeeProposalStore();
    (proposalStore as any).filePath = path.join(tempDir, "proposals.json");

    planning = new PlanningEngine();
    runs = new MeeRunEngine(runStore);
    safety = new MeeSafetyEngine();
    sandbox = new MeeSandboxEngine({ mockExec: true, mockResult: true });
    synth = new MeePatchSynthesizer();
    validator = new MeeValidator();
    rollback = new MeeRollbackEngine();

    memoryStore = new InMemoryMeeMemoryStore();
    orchestrator = new MeeAgentOrchestrator(tempDir);

    const plannerAgent = new PlannerAgent("agent-planner-1", "planner", planning);
    orchestrator.registerAgent(plannerAgent);

    engine = new MeeAutonomousEngine(
      jobStore,
      planning,
      runs,
      safety,
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
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("routes plan through PlannerAgent and records tasks/exchanges", async () => {
    const request = "Optimize UI styling and extractor";
    const job = engine.createJob(request);
    
    // Start job - should invoke PlannerAgent
    const started = await engine.startJob(job.id);
    expect(started).toBeDefined();

    // Verify task is scheduled and completed
    const tasks = orchestrator.getTasksForJob(job.id);
    expect(tasks.length).toBe(1);
    expect(tasks[0].type).toBe("plan_refinement");
    expect(tasks[0].status).toBe("completed");

    // Verify exchanges are recorded
    const exchanges = orchestrator.getExchangesForJob(job.id);
    expect(exchanges.length).toBe(2);
    expect(exchanges[0].direction).toBe("request");
    expect(exchanges[1].direction).toBe("response");
  });

  it("records success memory item upon successful job completion", async () => {
    const job = engine.createJob("Optimize UI styling and extractor");
    await engine.startJob(job.id);

    const worker = new MeeAutonomousWorker(jobStore, runs, engine, tempDir);
    await worker.start(10);

    // Poll for status to change to completed
    let status = "running";
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const currentJob = jobStore.get(job.id);
      if (currentJob && currentJob.status !== "running") {
        status = currentJob.status;
        break;
      }
    }
    worker.stop();

    expect(status).toBe("completed");

    // Verify memory item recorded
    const memories = memoryStore.queryByJob(job.id);
    expect(memories.length).toBeGreaterThan(0);
    const successMemory = memories.find((m) => m.tags.includes("success"));
    expect(successMemory).toBeDefined();
    expect(successMemory?.summary).toContain("completed successfully");

    // Clean up created proposal md files
    const proposals = proposalStore.loadAll();
    proposals.forEach((p) => {
      const docPath = path.resolve(process.cwd(), `docs/mee/proposal-${p.id}.md`);
      if (fs.existsSync(docPath)) {
        fs.unlinkSync(docPath);
      }
    });
  });
});
