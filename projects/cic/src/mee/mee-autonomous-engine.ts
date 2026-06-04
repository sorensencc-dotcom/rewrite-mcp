// File: projects/cic/src/mee/mee-autonomous-engine.ts | Date: 2026-06-04 | v1.2.0

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { PlanningEngine } from "./planning/planning-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
import {
  MeeAutonomousJob,
  MeeAutonomousJobStatus,
  PhaseProposal,
  MeePlanningMode,
  MeeRunFailureContext,
  MeeHealingPlan,
  PlanTree,
  MeeAgentTask,
  MeeAgentCritique,
} from "./mee-schema.js";
import { MeeSafetyEngine } from "./safety/safety-engine.js";
import { MeeSandboxEngine } from "./safety/sandbox-engine.js";
import { MeeRollbackEngine } from "./safety/rollback-engine.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
import { MeeProposalStore } from "./mee-proposal-store.js";
import { SelfHealingEngine } from "./self-healing/self-healing-engine.js";
import { MeeMemoryStore } from "./mee-memory-store.js";
import { MeeAgentOrchestrator } from "./mee-agent-orchestrator.js";
import { MeeKnowledgeGraph } from "./mee-kg.js";

export interface MeeAutonomousJobStore {
  save(job: MeeAutonomousJob): void;
  get(id: string): MeeAutonomousJob | undefined;
  list(): MeeAutonomousJob[];
}

export interface MeeRunFailureContextStore {
  save(context: MeeRunFailureContext): void;
  get(runId: string): MeeRunFailureContext | undefined;
  getByJob(jobId: string): MeeRunFailureContext | undefined;
  list(): MeeRunFailureContext[];
}

export interface MeeHealingPlanStore {
  save(plan: MeeHealingPlan): void;
  get(id: string): MeeHealingPlan | undefined;
  getByParentJob(jobId: string): MeeHealingPlan | undefined;
  list(): MeeHealingPlan[];
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
    private readonly failureStore?: MeeRunFailureContextStore,
    private readonly selfHealing?: SelfHealingEngine,
    private readonly healingPlanStore?: MeeHealingPlanStore,
    private readonly memoryStore?: MeeMemoryStore,
    private readonly orchestrator?: MeeAgentOrchestrator,
    private readonly kg?: MeeKnowledgeGraph,
  ) {}

  createJob(request: string, planningMode?: MeePlanningMode): MeeAutonomousJob {
    const now = new Date().toISOString();
    const job: MeeAutonomousJob = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: "pending",
      request,
      proposalIds: [],
      planningMode,
    };
    this.jobs.save(job);
    return job;
  }

  async startJob(id: string): Promise<MeeAutonomousJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    if (job.status !== "pending") return job;

    let plan = await this.planning.generatePlanWithMode(job.request, job.planningMode);

    // Record tasks in Knowledge Graph if available
    if (this.kg) {
      for (const t of plan.tasks) {
        this.kg.recordTaskNode(t.id, t.title, t.type, t.dependsOn);
      }
    }

    // Coordinate with PlannerAgent via Orchestrator if available
    if (this.orchestrator) {
      const tasks = this.orchestrator.scheduleTasksForPlan(job, plan);
      if (tasks.length > 0) {
        await this.orchestrator.dispatchTask(tasks[0].id);
        const history = this.orchestrator.getTaskHistory(tasks[0].id);
        const response = history.find((h) => h.direction === "response");
        if (response) {
          try {
            const data = JSON.parse(response.content);
            if (data.refinedPlan) {
              plan = data.refinedPlan;
            }
          } catch (e) {
            console.error("Failed to parse refined plan from agent response:", e);
          }
        }
      }
    }

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
    let patchSet = this.synth.synthesize(proposal);
    let patches = patchSet.patches;

    // Consensus Engine Gating
    if (this.orchestrator) {
      let currentProposal = { ...proposal };
      let currentPatches = [...patches];
      let currentPlan: PlanTree = { rootRequest: proposal.title, summary: proposal.planSummary, tasks: [] };
      
      let cycle = 1;
      const maxCycles = 3;
      let consensusPassed = false;
      let lastResult: any = null;

      while (cycle <= maxCycles && !consensusPassed) {
        const agents = this.orchestrator.getAgents();
        const critiqueTasks: MeeAgentTask[] = [];
        const now = new Date().toISOString();

        const fragile = this.kg ? this.kg.getFragileModules() : [];
        const risks = this.kg ? this.kg.getSafetyRisks() : [];
        const kgSummary = { fragile, risks };

        for (const agent of agents) {
          critiqueTasks.push({
            id: crypto.randomUUID(),
            agentId: agent.id,
            jobId,
            createdAt: now,
            type: "critique",
            payload: { proposal: currentProposal, patches: currentPatches, plan: currentPlan, kgSummary },
            status: "pending"
          });
        }

        const allTasks = this.orchestrator.loadTasks();
        allTasks.push(...critiqueTasks);
        this.orchestrator.saveTasks(allTasks);

        const exchanges = await this.orchestrator.runCritiqueRound(critiqueTasks);
        const critiques: MeeAgentCritique[] = [];
        for (const exchange of exchanges) {
          try {
            const data = JSON.parse(exchange.content);
            if (data.critiques) {
              critiques.push(...data.critiques);
              if (this.kg) {
                for (const c of data.critiques) {
                  this.kg.recordCritiqueEdge(proposalId, c);
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse critiques from agent response:", e);
          }
        }

        const result = this.orchestrator.runConsensusRound(critiques, proposalId, cycle);
        lastResult = result;

        this.addMemory(
          "job",
          jobId,
          job.runId,
          ["consensus", "critique", "phase38"],
          `Consensus round for proposal ${proposalId} (Cycle ${cycle})`,
          JSON.stringify(result)
        );

        if (result.decision === "ready") {
          consensusPassed = true;
          // Apply refined proposal back
          proposal.title = currentProposal.title;
          proposal.planSummary = currentProposal.planSummary;
          this.proposals.update(proposal.id, { 
            title: proposal.title,
            planSummary: proposal.planSummary
          });
          break;
        } else if (result.decision === "needs_revision") {
          const refined = await this.orchestrator.runRefinementRound(currentPlan, [currentProposal], critiques, jobId);
          currentPlan = refined.refinedPlan;
          if (refined.refinedProposals[0]) {
            currentProposal = refined.refinedProposals[0];
            patchSet = this.synth.synthesize(currentProposal);
            patches = patchSet.patches;
            currentPatches = patches;
          }

          this.addMemory(
            "job",
            jobId,
            job.runId,
            ["refinement", "phase38"],
            `Refinement completed for proposal ${proposalId} (Cycle ${cycle})`,
            JSON.stringify({ plan: currentPlan, proposal: currentProposal })
          );
          cycle++;
        } else {
          // Blocked
          break;
        }
      }

      if (!consensusPassed) {
        proposal.status = "rejected";
        this.proposals.update(proposal.id, { status: "rejected" });

        job.status = "failed";
        job.error = { 
          message: `Consensus block: Proposal ${proposalId} failed agent critiques with score ${lastResult?.score ?? 0}. Decision: ${lastResult?.decision ?? "blocked"}`, 
          code: "consensus_blocked" 
        };
        job.updatedAt = new Date().toISOString();
        this.jobs.save(job);

        if (job.runId) {
          this.runs.failRun(job.runId, job.error);
        }

        await this.handleFailure(job, [proposal.id], "consensus_blocked", job.error.message);
        return;
      }
    }

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

      await this.handleFailure(job, [proposal.id], "safety_block", job.error.message, { safetyReports: safetyReport });
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

      await this.handleFailure(job, [proposal.id], "sandbox_failed", job.error.message, {
        sandboxOutput: {
          buildOutput: sandboxResult.output,
          testOutput: "",
          errors: [sandboxResult.output]
        }
      });
      return;
    }

    // 4. Real validation check
    const validationReport = await this.validator.validateAll(patchSet);
    proposal.validationReport = validationReport;
    this.proposals.update(proposal.id, { validationReport });

    if (validationReport.passed && this.kg) {
      this.kg.recordProposalNode(proposalId, proposal.title, proposal.planSummary, proposal.filesCreated);
    }

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

      await this.handleFailure(job, [proposal.id], "validation_failed", job.error.message, {
        sandboxOutput: {
          buildOutput: "",
          testOutput: validationReport.errors.join("; "),
          errors: validationReport.errors
        }
      });
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

      await this.handleFailure(job, [proposal.id], "apply_failed", job.error.message);
      return;
    }

    if (job.runId) {
      this.runs.markStepComplete(job.runId);
    }

    job.updatedAt = new Date().toISOString();
    this.jobs.save(job);
  }

  private async handleFailure(
    job: MeeAutonomousJob,
    failingProposalIds: string[],
    errorCode: string,
    errorMessage: string,
    extra?: { safetyReports?: unknown; sandboxOutput?: MeeRunFailureContext["sandboxOutput"] }
  ): Promise<void> {
    if (!this.failureStore || !this.selfHealing || !this.healingPlanStore) {
      return;
    }

    const failure: MeeRunFailureContext = {
      runId: job.runId || `run-failed-${crypto.randomUUID()}`,
      jobId: job.id,
      createdAt: new Date().toISOString(),
      failingProposalIds,
      errorCode,
      errorMessage,
      safetyReports: extra?.safetyReports,
      sandboxOutput: extra?.sandboxOutput,
    };
    this.failureStore.save(failure);

    if (this.kg) {
      const failureId = `fail-${crypto.randomUUID()}`;
      for (const propId of failingProposalIds) {
        this.kg.recordFailureNode(failureId, propId, errorCode, errorMessage);
      }
    }

    this.addMemory(
      "job",
      job.id,
      job.runId,
      [errorCode, "failure"],
      `Failure in job ${job.id}: ${errorMessage}`,
      JSON.stringify(failure)
    );

    try {
      const plan = await this.planning.generatePlanWithMode(job.request, job.planningMode);
      const healingPlan = await this.selfHealing.generateHealingPlan(job, plan, failure);
      this.healingPlanStore.save(healingPlan);
    } catch (healErr) {
      console.error("Failed to generate healing plan:", healErr);
    }
  }

  public addMemory(
    scope: "repo" | "job" | "run",
    jobId: string | undefined,
    runId: string | undefined,
    tags: string[],
    summary: string,
    details: string
  ) {
    if (this.memoryStore) {
      this.memoryStore.add({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        scope,
        jobId,
        runId,
        tags,
        summary,
        details
      });
    }
  }
}
