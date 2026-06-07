// File: projects/cic/tests/mee/mee-autonomous-engine.test.ts | Date: 2026-06-03 | v1.0.1

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
import { MeeAutonomousJob } from "../../src/mee/mee-schema.js";
import fs from "node:fs";
import path from "node:path";

describe("MeeAutonomousEngine & Worker", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-autobuild-tests");
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

    engine = new MeeAutonomousEngine(
      jobStore,
      planning,
      runs,
      safety,
      sandbox,
      proposalStore,
      synth,
      validator,
      rollback
    );
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("creates and starts a job", async () => {
    const request = "Refactor validator and improve UI";
    const job = engine.createJob(request);
    expect(job.status).toBe("pending");
    expect(job.request).toBe(request);
    expect(job.proposalIds.length).toBe(0);

    const started = await engine.startJob(job.id);
    expect(started).toBeDefined();
    expect(started?.status).toBe("running");
    expect(started?.proposalIds.length).toBeGreaterThan(0);
    expect(started?.runId).toBeDefined();
    expect(started?.planId).toBeDefined();
  });

  it("completes job successfully via worker when all checks pass", async () => {
    const job = engine.createJob("Optimize UI styling and extractor");
    await engine.startJob(job.id);

    // Retrieve the updated job from store to have the runId
    const updatedJob = jobStore.get(job.id);
    expect(updatedJob).toBeDefined();
    expect(updatedJob?.runId).toBeDefined();

    const worker = new MeeAutonomousWorker(jobStore, runs, engine, tempDir);
    
    // Start worker poll, and wait shortly for it to complete the tasks
    await worker.start(10);
    
    // Poll for status to change
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
    const run = runs.getRun(updatedJob!.runId!);
    expect(run?.status).toBe("completed");

    // Clean up created proposal md files
    const proposals = proposalStore.loadAll();
    for (const p of proposals) {
      const docPath = path.resolve(process.cwd(), `docs/mee/proposal-${p.id}.md`);
      if (fs.existsSync(docPath)) {
        let deleted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            fs.unlinkSync(docPath);
            deleted = true;
            break;
          } catch (e) {
            await new Promise((r) => setTimeout(r, 50));
          }
        }
        if (!deleted) {
          try {
            fs.unlinkSync(docPath);
          } catch (e) {
            console.warn(`[Cleanup] Failed to unlink ${docPath}:`, e.message);
          }
        }
      }
    }
  });

  it("fails job on safety block", async () => {
    // Force safety check to fail
    safety.analyze = () => ({
      passed: false,
      riskLevel: "critical",
      issues: ["Dangerous pattern execution blocked."]
    });

    const job = engine.createJob("Add new extractor");
    await engine.startJob(job.id);

    // Retrieve the updated job from store to have the runId
    const updatedJob = jobStore.get(job.id);
    expect(updatedJob).toBeDefined();
    expect(updatedJob?.runId).toBeDefined();

    const worker = new MeeAutonomousWorker(jobStore, runs, engine, tempDir);
    await worker.start(10);

    let status = "running";
    let errorMsg = "";
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const currentJob = jobStore.get(job.id);
      if (currentJob && currentJob.status !== "running") {
        status = currentJob.status;
        errorMsg = currentJob.error?.message || "";
        break;
      }
    }

    worker.stop();

    expect(status).toBe("failed");
    expect(errorMsg).toContain("Safety check failed");

    const run = runs.getRun(updatedJob!.runId!);
    expect(run?.status).toBe("failed");
  });

  it("fails job on sandbox failure", async () => {
    // Force sandbox validation to fail
    sandbox.validate = async () => ({
      passed: false,
      compilePassed: false,
      testsPassed: false,
      output: "Compilation failed in sandbox."
    });

    const job = engine.createJob("Fix build for new extractor");
    await engine.startJob(job.id);

    // Retrieve the updated job from store to have the runId
    const updatedJob = jobStore.get(job.id);
    expect(updatedJob).toBeDefined();
    expect(updatedJob?.runId).toBeDefined();

    const worker = new MeeAutonomousWorker(jobStore, runs, engine, tempDir);
    await worker.start(10);

    let status = "running";
    let errorMsg = "";
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const currentJob = jobStore.get(job.id);
      if (currentJob && currentJob.status !== "running") {
        status = currentJob.status;
        errorMsg = currentJob.error?.message || "";
        break;
      }
    }

    worker.stop();

    expect(status).toBe("failed");
    expect(errorMsg).toContain("Sandbox validation failed");

    const run = runs.getRun(updatedJob!.runId!);
    expect(run?.status).toBe("failed");
  });
});
