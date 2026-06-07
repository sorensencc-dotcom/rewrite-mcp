// File: projects/cic/src/mee/mee-run-engine.ts | Date: 2026-06-03 | v1.0.0

import crypto from "node:crypto";
import { MeeRun, MeeCheckpoint, MeeRunStatus } from "./mee-schema.js";

export interface MeeRunStore {
  saveRun(run: MeeRun): void;
  getRun(id: string): MeeRun | undefined;
  saveCheckpoint(cp: MeeCheckpoint): void;
  getCheckpoints(runId: string): MeeCheckpoint[];
}

export class MeeRunEngine {
  constructor(private readonly store: MeeRunStore) {}

  createRun(params: { proposalIds: string[]; planId?: string }): MeeRun {
    const now = new Date().toISOString();
    const run: MeeRun = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: "pending",
      planId: params.planId,
      proposalIds: params.proposalIds,
      currentStepIndex: 0,
      totalSteps: params.proposalIds.length,
    };
    this.store.saveRun(run);
    return run;
  }

  getRun(id: string): MeeRun | undefined {
    return this.store.getRun(id);
  }

  startRun(id: string): MeeRun | undefined {
    const run = this.store.getRun(id);
    if (!run) return undefined;
    if (run.status !== "pending" && run.status !== "paused") return run;

    run.status = "running";
    run.updatedAt = new Date().toISOString();
    this.store.saveRun(run);
    return run;
  }

  checkpoint(runId: string, label: string | undefined, data: Record<string, unknown>): MeeCheckpoint | undefined {
    const run = this.store.getRun(runId);
    if (!run) return undefined;

    const cp: MeeCheckpoint = {
      id: crypto.randomUUID(),
      runId,
      createdAt: new Date().toISOString(),
      label,
      data,
    };
    this.store.saveCheckpoint(cp);
    run.lastCheckpointId = cp.id;
    run.updatedAt = new Date().toISOString();
    this.store.saveRun(run);
    return cp;
  }

  markStepComplete(runId: string): MeeRun | undefined {
    const run = this.store.getRun(runId);
    if (!run) return undefined;

    run.currentStepIndex += 1;
    if (run.currentStepIndex >= run.totalSteps) {
      run.status = "completed";
    }
    run.updatedAt = new Date().toISOString();
    this.store.saveRun(run);
    return run;
  }

  failRun(runId: string, error: { message: string; code?: string }): MeeRun | undefined {
    const run = this.store.getRun(runId);
    if (!run) return undefined;

    run.status = "failed";
    run.error = error;
    run.updatedAt = new Date().toISOString();
    this.store.saveRun(run);
    return run;
  }

  cancelRun(runId: string): MeeRun | undefined {
    const run = this.store.getRun(runId);
    if (!run) return undefined;

    run.status = "canceled";
    run.updatedAt = new Date().toISOString();
    this.store.saveRun(run);
    return run;
  }
}
