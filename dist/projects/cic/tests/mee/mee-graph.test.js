"use strict";
// File: projects/cic/tests/mee/mee-graph.test.ts | Date: 2026-06-03 | v1.1.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mee_proposal_graph_js_1 = require("../../src/mee/mee-proposal-graph.js");
const mee_synthesizer_js_1 = require("../../src/mee/mee-synthesizer.js");
const mee_validator_js_1 = require("../../src/mee/mee-validator.js");
(0, vitest_1.describe)("MeeProposalGraph", () => {
    const synth = new mee_synthesizer_js_1.MeePatchSynthesizer();
    const validator = new mee_validator_js_1.MeeValidator();
    (0, vitest_1.it)("detects path conflicts between multiple proposals", () => {
        const customSynth = new class extends mee_synthesizer_js_1.MeePatchSynthesizer {
            synthesize(proposal) {
                return {
                    proposalId: proposal.id,
                    patches: [
                        { path: "docs/mee/conflict.md", type: "create", content: `Content for ${proposal.id}` }
                    ]
                };
            }
        };
        const graphEngine = new mee_proposal_graph_js_1.MeeProposalGraph(customSynth, validator);
        const proposals = [
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
        (0, vitest_1.expect)(g.conflicts.length).toBe(1);
        (0, vitest_1.expect)(g.conflicts[0].path).toBe("docs/mee/conflict.md");
        (0, vitest_1.expect)(g.conflicts[0].proposalA).toBe("p1");
        (0, vitest_1.expect)(g.conflicts[0].proposalB).toBe("p2");
    });
    (0, vitest_1.it)("orders proposals by dependency", () => {
        const graphEngine = new mee_proposal_graph_js_1.MeeProposalGraph(synth, validator);
        const proposals = [
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
        (0, vitest_1.expect)(g.edges.length).toBe(1);
        (0, vitest_1.expect)(g.edges[0].from).toBe("p1");
        (0, vitest_1.expect)(g.edges[0].to).toBe("p2");
        const ordered = graphEngine.topologicalSort(g);
        (0, vitest_1.expect)(ordered.length).toBe(2);
        (0, vitest_1.expect)(ordered[0].id).toBe("p1");
        (0, vitest_1.expect)(ordered[1].id).toBe("p2");
    });
});
//# sourceMappingURL=mee-graph.test.js.map