// File: projects/cic/tests/mee/mee-proposal-store.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MeeProposalStore } from "../../src/mee/mee-proposal-store.js";
import { PhaseProposal } from "../../src/mee/mee-schema.js";

const TEST_BASE = path.join(process.cwd(), ".tmp", "mee-store-test");

function cleanup() {
  if (fs.existsSync(TEST_BASE)) {
    fs.rmSync(TEST_BASE, { recursive: true, force: true });
  }
}

describe("MeeProposalStore", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns empty list when no file exists", () => {
    const store = new MeeProposalStore(TEST_BASE);
    const all = store.loadAll();
    expect(all).toEqual([]);
  });

  it("adds and retrieves a proposal", () => {
    const store = new MeeProposalStore(TEST_BASE);
    const proposal: PhaseProposal = {
      id: "p1",
      title: "Test Proposal",
      triggerId: "t1",
      status: "pending",
      filesCreated: [],
      planSummary: "summary",
      timestamp: Date.now(),
    };

    store.add(proposal);
    const loaded = store.get("p1");
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("Test Proposal");
  });

  it("updates an existing proposal", () => {
    const store = new MeeProposalStore(TEST_BASE);
    const proposal: PhaseProposal = {
      id: "p2",
      title: "Initial",
      triggerId: "t2",
      status: "pending",
      filesCreated: [],
      planSummary: "summary",
      timestamp: Date.now(),
    };

    store.add(proposal);
    store.update("p2", { status: "validated" });

    const loaded = store.get("p2");
    expect(loaded?.status).toBe("validated");
  });

  it("persists across instances", () => {
    const store1 = new MeeProposalStore(TEST_BASE);
    const proposal: PhaseProposal = {
      id: "p3",
      title: "Persisted",
      triggerId: "t3",
      status: "pending",
      filesCreated: [],
      planSummary: "summary",
      timestamp: Date.now(),
    };

    store1.add(proposal);

    const store2 = new MeeProposalStore(TEST_BASE);
    const all = store2.loadAll();
    expect(all.find((p) => p.id === "p3")).toBeTruthy();
  });
});
