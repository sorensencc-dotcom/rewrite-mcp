"use strict";
// File: projects/cic/tests/mee/mee-run-engine.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mee_run_engine_js_1 = require("../../src/mee/mee-run-engine.js");
class InMemoryRunStore {
    constructor() {
        this.runs = new Map();
        this.cps = [];
    }
    saveRun(run) {
        this.runs.set(run.id, run);
    }
    getRun(id) {
        return this.runs.get(id);
    }
    saveCheckpoint(cp) {
        this.cps.push(cp);
    }
    getCheckpoints(runId) {
        return this.cps.filter((c) => c.runId === runId);
    }
}
(0, vitest_1.describe)("MeeRunEngine", () => {
    (0, vitest_1.it)("creates and starts a run", () => {
        const store = new InMemoryRunStore();
        const engine = new mee_run_engine_js_1.MeeRunEngine(store);
        const run = engine.createRun({ proposalIds: ["p1", "p2"] });
        (0, vitest_1.expect)(run.status).toBe("pending");
        (0, vitest_1.expect)(run.totalSteps).toBe(2);
        (0, vitest_1.expect)(run.currentStepIndex).toBe(0);
        const started = engine.startRun(run.id);
        (0, vitest_1.expect)(started.status).toBe("running");
    });
    (0, vitest_1.it)("creates checkpoints, advances steps, fails and cancels runs", () => {
        const store = new InMemoryRunStore();
        const engine = new mee_run_engine_js_1.MeeRunEngine(store);
        const run = engine.createRun({ proposalIds: ["p1"] });
        engine.startRun(run.id);
        const cp = engine.checkpoint(run.id, "mid", { foo: "bar" });
        (0, vitest_1.expect)(cp).toBeDefined();
        (0, vitest_1.expect)(cp.label).toBe("mid");
        (0, vitest_1.expect)(cp.data.foo).toBe("bar");
        const runWithCp = store.getRun(run.id);
        (0, vitest_1.expect)(runWithCp.lastCheckpointId).toBe(cp.id);
        const updated = engine.markStepComplete(run.id);
        (0, vitest_1.expect)(updated.currentStepIndex).toBe(1);
        (0, vitest_1.expect)(updated.status).toBe("completed");
        // Test failing
        const run2 = engine.createRun({ proposalIds: ["p2"] });
        engine.startRun(run2.id);
        const failed = engine.failRun(run2.id, { message: "Test error", code: "TEST_ERR" });
        (0, vitest_1.expect)(failed.status).toBe("failed");
        (0, vitest_1.expect)(failed.error.message).toBe("Test error");
        // Test cancelling
        const run3 = engine.createRun({ proposalIds: ["p3"] });
        engine.startRun(run3.id);
        const cancelled = engine.cancelRun(run3.id);
        (0, vitest_1.expect)(cancelled.status).toBe("canceled");
    });
});
//# sourceMappingURL=mee-run-engine.test.js.map