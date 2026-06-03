// File: projects/cic/tests/mee/mee-graph.test.ts | Date: 2026-06-03 | v1.1.0

import { describe, it, expect } from "vitest";
import { MeeProposalGraph } from "../../src/mee/mee-proposal-graph.js";
import { MeePatchSynthesizer } from "../../src/mee/mee-synthesizer.js";
import { MeeValidator } from "../../src/mee/mee-validator.js";
import { PhaseProposal } from "../../src/mee/mee-schema.js";

describe("MeeProposalGraph", () => {
  const synth = new MeePatchSynthesizer();
  const validator = new MeeValidator();

  it("detects path conflicts between multiple proposals", () => {
    const customSynth = new class extends MeePatchSynthesizer {
      override synthesize(proposal: PhaseProposal) {
        return {
          proposalId: proposal.id,
          patches: [
            { path: "docs/mee/conflict.md", type: "create" as const, content: `Content for ${proposal.id}` }
          ]
        };
      }
    };

    const graphEngine = new MeeProposalGraph(customSynth, validator);

    const proposals: PhaseProposal[] = [
      {
        id: "p1",
        title: "Proposal A",
        trigger: { id: "e1", type: "drift", payload: {}, timestamp: Date.now() },
        status: "pending",
        filesCreated: [],
        planSummary: "A",
        timestamp: Date.now()
      },
      {
        id: "p2",
        title: "Proposal B",
        trigger: { id: "e2", type: "drift", payload: {}, timestamp: Date.now() },
        status: "pending",
        filesCreated: [],
        planSummary: "B",
        timestamp: Date.now()
      }
    ];

    const g = graphEngine.buildGraph(proposals);
    expect(g.conflicts.length).toBe(1);
    expect(g.conflicts[0].path).toBe("docs/mee/conflict.md");
    expect(g.conflicts[0].proposalA).toBe("p1");
    expect(g.conflicts[0].proposalB).toBe("p2");
  });

  it("orders proposals by dependency", () => {
    const graphEngine = new MeeProposalGraph(synth, validator);

    const proposals: PhaseProposal[] = [
      {
        id: "p2",
        title: "Phase 31: Next Engine",
        trigger: { id: "e2", type: "drift", payload: {}, timestamp: Date.now() },
        status: "pending",
        filesCreated: [],
        planSummary: "Plan 31",
        timestamp: Date.now()
      },
      {
        id: "p1",
        title: "Phase 30: Validation Engine",
        trigger: { id: "e1", type: "drift", payload: {}, timestamp: Date.now() },
        status: "pending",
        filesCreated: [],
        planSummary: "Plan 30",
        timestamp: Date.now()
      }
    ];

    const g = graphEngine.buildGraph(proposals);
    expect(g.edges.length).toBe(1);
    expect(g.edges[0].from).toBe("p1");
    expect(g.edges[0].to).toBe("p2");

    const ordered = graphEngine.topologicalSort(g);
    expect(ordered.length).toBe(2);
    expect(ordered[0].id).toBe("p1");
    expect(ordered[1].id).toBe("p2");
  });
});
