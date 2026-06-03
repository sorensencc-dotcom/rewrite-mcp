// File: projects/cic/src/mee/mee-autonomous-engine.ts | Date: 2026-06-03 | v1.0.0

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { PlanningEngine } from "./planning/planning-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
import { MeeAutonomousJob, MeeAutonomousJobStatus, PhaseProposal } from "./mee-schema.js";
import { MeeSafetyEngine } from "./safety/safety-engine.js";
import { MeeSandboxEngine } from "./safety/sandbox-engine.js";
import { MeeRollbackEngine } from "./safety/rollback-engine.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
import { MeeProposalStore } from "./mee-proposal-store.js";

export interface MeeAutonomousJobStore {
  save(job: MeeAutonomousJob): void;
  get(id: string): MeeAutonomousJob | undefined;
  list(): MeeAutonomousJob[];
}

export class MeeAutonomousEngine {
  constructor(
    private readonly jobs: MeeAutonomousJobStore,
    private readonly planning: PlanningEngine,
    private readonly runs: MeeRunEngine,
    private readonly safety: MeeSafetyEngine,
    private readonly sandbox: MeeSandboxEngine,
    private readonly proposals: MeeProposalStore,
    private readonly synth: MeePatchSynthesizer,
    private readonly validator: MeeValidator,
    private readonly rollback: MeeRollbackEngine,
  ) {}

  createJob(request: string): MeeAutonomousJob {
    const now = new Date().toISOString();
    const job: MeeAutonomousJob = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: "pending",
      request,
      proposalIds: [],
    };
    this.jobs.save(job);
    return job;
  }

  startJob(id: string): MeeAutonomousJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    if (job.status !== "pending") return job;

    const plan = this.planning.generatePlan(job.request);
    const proposals = this.planning.generateProposals(plan);
    proposals.forEach((p) => this.proposals.add(p));

    const run = this.runs.createRun({
      proposalIds: proposals.map((p) => p.id),
      planId: plan.rootRequest,
    });
    this.runs.startRun(run.id);

    job.planId = plan.rootRequest;
    job.runId = run.id;
    job.proposalIds = proposals.map((p) => p.id);
    job.status = "running";
    job.updatedAt = new Date().toISOString();
    this.jobs.save(job);

    return job;
  }

  async executeStep(jobId: string, proposalId: string, workspacePath: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "running") return;

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      job.status = "failed";
      job.error = { message: `Missing proposal ${proposalId}` };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);
      return;
    }

    // 1. Synthesize patches
    const patchSet = this.synth.synthesize(proposal);
    const patches = patchSet.patches;

    // 2. Safety check
    const safetyReport = this.safety.analyze(patches);
    proposal.safetyReport = safetyReport;
    this.proposals.update(proposal.id, { safetyReport });

    if (!safetyReport.passed) {
      proposal.status = "rejected";
      this.proposals.update(proposal.id, { status: "rejected" });

      job.status = "failed";
      job.error = { message: `Safety check failed: Risk level is ${safetyReport.riskLevel}. Issues: ${safetyReport.issues.join("; ")}`, code: "safety_block" };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);

      if (job.runId) {
        this.runs.failRun(job.runId, job.error);
      }
      return;
    }

    // 3. Sandbox check
    const sandboxResult = await this.sandbox.validate(patches);
    proposal.sandboxResult = sandboxResult;
    this.proposals.update(proposal.id, { sandboxResult });

    if (!sandboxResult.passed) {
      proposal.status = "rejected";
      this.proposals.update(proposal.id, { status: "rejected" });

      job.status = "failed";
      job.error = { message: `Sandbox validation failed. Output: ${sandboxResult.output}`, code: "sandbox_failed" };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);

      if (job.runId) {
        this.runs.failRun(job.runId, job.error);
      }
      return;
    }

    // 4. Real validation check
    const validationReport = await this.validator.validateAll(patchSet);
    proposal.validationReport = validationReport;
    this.proposals.update(proposal.id, { validationReport });

    if (!validationReport.passed) {
      proposal.status = "rejected";
      this.proposals.update(proposal.id, { status: "rejected" });

      job.status = "failed";
      job.error = { message: `Validation check failed: ${validationReport.errors.join("; ")}`, code: "validation_failed" };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);

      if (job.runId) {
        this.runs.failRun(job.runId, job.error);
      }
      return;
    }

    // 5. Apply patch set with backup/rollback support
    if (job.runId) {
      this.runs.checkpoint(job.runId, `before-apply-${proposalId}`, { proposalId });
    }

    let backupMap: Record<string, string | null> | null = null;
    try {
      backupMap = this.rollback.snapshot(patches);
      const created: string[] = [];

      for (const patch of patches) {
        const full = path.resolve(process.cwd(), patch.path);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, patch.content, "utf8");
        created.push(patch.path);
      }

      proposal.status = "applied";
      proposal.filesCreated = created;
      this.proposals.update(proposal.id, {
        status: "applied",
        filesCreated: created
      });
    } catch (err: any) {
      if (backupMap) {
        try {
          this.rollback.restore(backupMap);
        } catch (rollErr) {
          console.error("ABM Rollback restore failed:", rollErr);
        }
      }
      proposal.status = "rejected";
      this.proposals.update(proposal.id, { status: "rejected" });

      job.status = "failed";
      job.error = { message: `Failed to apply patches: ${err.message}. Rollback executed.`, code: "apply_failed" };
      job.updatedAt = new Date().toISOString();
      this.jobs.save(job);

      if (job.runId) {
        this.runs.failRun(job.runId, job.error);
      }
      return;
    }

    if (job.runId) {
      this.runs.markStepComplete(job.runId);
    }

    job.updatedAt = new Date().toISOString();
    this.jobs.save(job);
  }
}
