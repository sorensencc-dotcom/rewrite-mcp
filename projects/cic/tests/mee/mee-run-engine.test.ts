// File: projects/cic/tests/mee/mee-run-engine.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { MeeRunEngine, MeeRunStore } from "../../src/mee/mee-run-engine.js";
import { MeeRun, MeeCheckpoint } from "../../src/mee/mee-schema.js";

class InMemoryRunStore implements MeeRunStore {
  runs = new Map<string, MeeRun>();
  cps: MeeCheckpoint[] = [];

  saveRun(run: MeeRun) {
    this.runs.set(run.id, run);
  }

  getRun(id: string) {
    return this.runs.get(id);
  }

  saveCheckpoint(cp: MeeCheckpoint) {
    this.cps.push(cp);
  }

  getCheckpoints(runId: string) {
    return this.cps.filter((c) => c.runId === runId);
  }
}

describe("MeeRunEngine", () => {
  it("creates and starts a run", () => {
    const store = new InMemoryRunStore();
    const engine = new MeeRunEngine(store);
    const run = engine.createRun({ proposalIds: ["p1", "p2"] });
    expect(run.status).toBe("pending");
    expect(run.totalSteps).toBe(2);
    expect(run.currentStepIndex).toBe(0);

    const started = engine.startRun(run.id)!;
    expect(started.status).toBe("running");
  });

  it("creates checkpoints, advances steps, fails and cancels runs", () => {
    const store = new InMemoryRunStore();
    const engine = new MeeRunEngine(store);
    const run = engine.createRun({ proposalIds: ["p1"] });
    engine.startRun(run.id);

    const cp = engine.checkpoint(run.id, "mid", { foo: "bar" });
    expect(cp).toBeDefined();
    expect(cp!.label).toBe("mid");
    expect(cp!.data.foo).toBe("bar");

    const runWithCp = store.getRun(run.id)!;
    expect(runWithCp.lastCheckpointId).toBe(cp!.id);

    const updated = engine.markStepComplete(run.id)!;
    expect(updated.currentStepIndex).toBe(1);
    expect(updated.status).toBe("completed");

    // Test failing
    const run2 = engine.createRun({ proposalIds: ["p2"] });
    engine.startRun(run2.id);
    const failed = engine.failRun(run2.id, { message: "Test error", code: "TEST_ERR" })!;
    expect(failed.status).toBe("failed");
    expect(failed.error!.message).toBe("Test error");

    // Test cancelling
    const run3 = engine.createRun({ proposalIds: ["p3"] });
    engine.startRun(run3.id);
    const cancelled = engine.cancelRun(run3.id)!;
    expect(cancelled.status).toBe("canceled");
  });
});
