// File: projects/cic/tests/mee/abm-healing-flow.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MeeAutonomousEngine } from "../../src/mee/mee-autonomous-engine.js";
import { FileMeeAutonomousJobStore, FileMeeRunFailureContextStore, FileMeeHealingPlanStore } from "../../src/mee/mee-autonomous-store.js";
import { PlanningEngine } from "../../src/mee/planning/planning-engine.js";
import { MeeRunEngine } from "../../src/mee/mee-run-engine.js";
import { FileMeeRunStore } from "../../src/mee/mee-run-store.js";
import { MeeSafetyEngine } from "../../src/mee/safety/safety-engine.js";
import { MeeSandboxEngine } from "../../src/mee/safety/sandbox-engine.js";
import { MeeRollbackEngine } from "../../src/mee/safety/rollback-engine.js";
import { MeePatchSynthesizer } from "../../src/mee/mee-synthesizer.js";
import { MeeValidator } from "../../src/mee/mee-validator.js";
import { MeeProposalStore } from "../../src/mee/mee-proposal-store.js";
import { SelfHealingEngine } from "../../src/mee/self-healing/self-healing-engine.js";
import fs from "node:fs";
import path from "node:path";

describe("ABM Self-Healing Flow", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-healing-tests");
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
  let failureStore: FileMeeRunFailureContextStore;
  let healingPlanStore: FileMeeHealingPlanStore;
  let selfHealing: SelfHealingEngine;
  let engine: MeeAutonomousEngine;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    jobStore = new FileMeeAutonomousJobStore(tempDir);
    runStore = new FileMeeRunStore(tempDir);
    failureStore = new FileMeeRunFailureContextStore(tempDir);
    healingPlanStore = new FileMeeHealingPlanStore(tempDir);

    proposalStore = new MeeProposalStore();
    (proposalStore as any).filePath = path.join(tempDir, "proposals.json");

    planning = new PlanningEngine();
    runs = new MeeRunEngine(runStore);
    safety = new MeeSafetyEngine();
    sandbox = new MeeSandboxEngine({ mockExec: true, mockResult: true });
    synth = new MeePatchSynthesizer();
    validator = new MeeValidator();
    rollback = new MeeRollbackEngine();

    const mockHealingLLM = {
      suggestHealing: async (input: any) => ({
        summary: "Mock fix suggestion",
        tasks: [{ title: "Auto Fix", description: "Fix build", type: "fix" }],
      }),
    };
    selfHealing = new SelfHealingEngine(mockHealingLLM);

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
      failureStore,
      selfHealing,
      healingPlanStore
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("captures failure context and generates healing plan when sandbox checks fail", async () => {
    // Force sandbox validation to fail
    sandbox.validate = async () => ({
      passed: false,
      compilePassed: false,
      testsPassed: false,
      output: "Compilation failed mock error."
    });

    const job = engine.createJob("Build complex feature");
    await engine.startJob(job.id);

    const started = jobStore.get(job.id);
    expect(started?.proposalIds.length).toBeGreaterThan(0);
    const proposalId = started!.proposalIds[0];

    // Execute step - should trigger sandbox failure
    await engine.executeStep(job.id, proposalId, tempDir);

    // Verify job status
    const updatedJob = jobStore.get(job.id);
    expect(updatedJob?.status).toBe("failed");
    expect(updatedJob?.error?.code).toBe("sandbox_failed");

    // Verify failure context was saved
    const failure = failureStore.getByJob(job.id);
    expect(failure).toBeDefined();
    expect(failure?.errorCode).toBe("sandbox_failed");
    expect(failure?.failingProposalIds).toContain(proposalId);
    expect(failure?.sandboxOutput?.buildOutput).toContain("Compilation failed mock error");

    // Verify healing plan was saved
    const healingPlan = healingPlanStore.getByParentJob(job.id);
    expect(healingPlan).toBeDefined();
    expect(healingPlan?.parentJobId).toBe(job.id);
    expect(healingPlan?.summary).toBe("Mock fix suggestion");
    expect(healingPlan?.suggestedTasks.length).toBe(1);
    expect(healingPlan?.suggestedTasks[0].title).toBe("Auto Fix");
  });
});
