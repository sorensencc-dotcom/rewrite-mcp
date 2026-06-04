// File: projects/cic/tests/mee/mee-scheduler.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { MeeScheduler } from "../../src/mee/mee-scheduler.js";
import { MeeAutonomousEngine } from "../../src/mee/mee-autonomous-engine.js";
import { FileMeeAutonomousJobStore } from "../../src/mee/mee-autonomous-store.js";
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

describe("MeeScheduler Subsystem", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-scheduler-tests");
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
      undefined,
      undefined,
      undefined,
      memoryStore,
      orchestrator
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should run jobs in priority order and respect concurrency limits", async () => {
    // Create scheduler with concurrency limit 1
    const scheduler = new MeeScheduler(jobStore, runs, engine, tempDir, 1);

    // Create 3 jobs: Job 1 (Priority 1), Job 2 (Priority 10), Job 3 (Priority 5)
    const job1 = engine.createJob("Task 1");
    job1.priority = 1;
    jobStore.save(job1);

    const job2 = engine.createJob("Task 2");
    job2.priority = 10;
    jobStore.save(job2);

    const job3 = engine.createJob("Task 3");
    job3.priority = 5;
    jobStore.save(job3);

    // Run tick - should start job 2 (highest priority)
    await scheduler.tick();

    const state = scheduler.getQueueState();
    expect(state.activeCount).toBe(1);
    expect(state.activeJobIds[0]).toBe(job2.id);

    // Job 1 and Job 3 should be in pending/paused lists
    expect(state.pendingJobIds.includes(job1.id)).toBe(true);
    expect(state.pendingJobIds.includes(job3.id)).toBe(true);
  });

  it("should not start jobs whose dependencies are not completed", async () => {
    const scheduler = new MeeScheduler(jobStore, runs, engine, tempDir, 2);

    // Job 1 (Priority 1)
    const job1 = engine.createJob("Task 1");
    job1.priority = 1;
    jobStore.save(job1);

    // Job 2 depends on Job 1
    const job2 = engine.createJob("Task 2");
    job2.priority = 10;
    job2.dependsOnJobIds = [job1.id];
    jobStore.save(job2);

    // Run tick
    await scheduler.tick();

    const state = scheduler.getQueueState();
    // Job 2 has higher priority, but since Job 1 isn't completed, Job 2 cannot run. Only Job 1 should run.
    expect(state.activeCount).toBe(1);
    expect(state.activeJobIds[0]).toBe(job1.id);
  });

  it("should preempt a running job when a higher priority job is submitted and concurrency limit is met", async () => {
    const scheduler = new MeeScheduler(jobStore, runs, engine, tempDir, 1);

    // Start Job 1 with Priority 1
    const job1 = engine.createJob("Task 1");
    job1.priority = 1;
    jobStore.save(job1);

    await scheduler.tick();

    let state = scheduler.getQueueState();
    expect(state.activeJobIds[0]).toBe(job1.id);

    // Now submit a higher priority Job 2 (Priority 10)
    const job2 = engine.createJob("Task 2");
    job2.priority = 10;
    jobStore.save(job2);

    // Run tick - should preempt Job 1 and start Job 2
    await scheduler.tick();

    state = scheduler.getQueueState();
    expect(state.activeJobIds[0]).toBe(job2.id);
    expect(state.pausedJobIds[0]).toBe(job1.id);

    const freshJob1 = jobStore.get(job1.id);
    expect(freshJob1?.status).toBe("paused");
  });
});
