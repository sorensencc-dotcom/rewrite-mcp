"use strict";
// File: projects/cic/src/mee/mee-run-engine.ts | Date: 2026-06-03 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeRunEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class MeeRunEngine {
    constructor(store) {
        this.store = store;
    }
    createRun(params) {
        const now = new Date().toISOString();
        const run = {
            id: node_crypto_1.default.randomUUID(),
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
    getRun(id) {
        return this.store.getRun(id);
    }
    startRun(id) {
        const run = this.store.getRun(id);
        if (!run)
            return undefined;
        if (run.status !== "pending" && run.status !== "paused")
            return run;
        run.status = "running";
        run.updatedAt = new Date().toISOString();
        this.store.saveRun(run);
        return run;
    }
    checkpoint(runId, label, data) {
        const run = this.store.getRun(runId);
        if (!run)
            return undefined;
        const cp = {
            id: node_crypto_1.default.randomUUID(),
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
    markStepComplete(runId) {
        const run = this.store.getRun(runId);
        if (!run)
            return undefined;
        run.currentStepIndex += 1;
        if (run.currentStepIndex >= run.totalSteps) {
            run.status = "completed";
        }
        run.updatedAt = new Date().toISOString();
        this.store.saveRun(run);
        return run;
    }
    failRun(runId, error) {
        const run = this.store.getRun(runId);
        if (!run)
            return undefined;
        run.status = "failed";
        run.error = error;
        run.updatedAt = new Date().toISOString();
        this.store.saveRun(run);
        return run;
    }
    cancelRun(runId) {
        const run = this.store.getRun(runId);
        if (!run)
            return undefined;
        run.status = "canceled";
        run.updatedAt = new Date().toISOString();
        this.store.saveRun(run);
        return run;
    }
}
exports.MeeRunEngine = MeeRunEngine;
//# sourceMappingURL=mee-run-engine.js.map