// File: projects/cic/tests/mee/mee-negotiation.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect } from "vitest";
import { MeeNegotiationAgent } from "../../src/mee/mee-negotiation-agent.js";
import { MeeNegotiationEngine } from "../../src/mee/mee-negotiation-engine.js";
import { PhaseProposal } from "../../src/mee/mee-schema.js";

describe("MeeNegotiationEngine", () => {
  it("detects conflicts between agents", () => {
    const propA: PhaseProposal = {
      id: "p1",
      title: "Proposal A",
      trigger: { id: "e1", type: "drift", payload: {}, timestamp: Date.now() },
      status: "pending",
      filesCreated: [],
      planSummary: "A",
      timestamp: Date.now()
    };
    const patchA = {
      proposalId: "p1",
      patches: [{ path: "docs/mee/proposal-p1.md", type: "create" as const, content: "A" }]
    };

    const propB: PhaseProposal = {
      id: "p2",
      title: "Proposal B",
      trigger: { id: "e2", type: "drift", payload: {}, timestamp: Date.now() },
      status: "pending",
      filesCreated: [],
      planSummary: "B",
      timestamp: Date.now()
    };
    const patchB = {
      proposalId: "p2",
      patches: [{ path: "docs/mee/proposal-p1.md", type: "create" as const, content: "B" }]
    };

    const agentA = new MeeNegotiationAgent(propA, patchA);
    const agentB = new MeeNegotiationAgent(propB, patchB);

    const resolution = agentA.analyzeConflicts(agentB);
    expect(resolution).not.toBeNull();
    expect(resolution?.type).toBe("reorder");
    expect(resolution?.details?.path).toBe("docs/mee/proposal-p1.md");
  });

  it("produces a stable consensus plan and logs transcripts", () => {
    const propA: PhaseProposal = {
      id: "p1",
      title: "Phase 30: Validation",
      trigger: { id: "e1", type: "drift", payload: {}, timestamp: Date.now() },
      status: "pending",
      filesCreated: [],
      planSummary: "A",
      timestamp: Date.now()
    };
    const patchA = {
      proposalId: "p1",
      patches: [{ path: "docs/mee/proposal-p1.md", type: "create" as const, content: "A" }]
    };

    const propB: PhaseProposal = {
      id: "p2",
      title: "Phase 31: Apply Pipeline",
      trigger: { id: "e2", type: "drift", payload: {}, timestamp: Date.now() },
      status: "pending",
      filesCreated: [],
      planSummary: "B",
      timestamp: Date.now()
    };
    const patchB = {
      proposalId: "p2",
      patches: [{ path: "docs/mee/proposal-p2.md", type: "create" as const, content: "B" }]
    };

    const agentA = new MeeNegotiationAgent(propA, patchA);
    const agentB = new MeeNegotiationAgent(propB, patchB);

    const engine = new MeeNegotiationEngine();
    const agents = [agentB, agentA];

    engine.runUntilStable(agents);
    const transcript = engine.getTranscript();
    expect(transcript.length).toBeGreaterThan(0);

    const consensus = engine.produceConsensusPlan(agents);
    expect(consensus.length).toBe(2);
    expect(consensus[0].id).toBe("p1");
    expect(consensus[1].id).toBe("p2");
  });
});
