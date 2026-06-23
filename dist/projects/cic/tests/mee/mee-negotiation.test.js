"use strict";
// File: projects/cic/tests/mee/mee-negotiation.test.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mee_negotiation_agent_js_1 = require("../../src/mee/mee-negotiation-agent.js");
const mee_negotiation_engine_js_1 = require("../../src/mee/mee-negotiation-engine.js");
(0, vitest_1.describe)("MeeNegotiationEngine", () => {
    (0, vitest_1.it)("detects conflicts between agents", () => {
        const propA = {
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
            patches: [{ path: "docs/mee/proposal-p1.md", type: "create", content: "A" }]
        };
        const propB = {
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
            patches: [{ path: "docs/mee/proposal-p1.md", type: "create", content: "B" }]
        };
        const agentA = new mee_negotiation_agent_js_1.MeeNegotiationAgent(propA, patchA);
        const agentB = new mee_negotiation_agent_js_1.MeeNegotiationAgent(propB, patchB);
        const resolution = agentA.analyzeConflicts(agentB);
        (0, vitest_1.expect)(resolution).not.toBeNull();
        (0, vitest_1.expect)(resolution?.type).toBe("reorder");
        (0, vitest_1.expect)(resolution?.details?.path).toBe("docs/mee/proposal-p1.md");
    });
    (0, vitest_1.it)("produces a stable consensus plan and logs transcripts", () => {
        const propA = {
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
            patches: [{ path: "docs/mee/proposal-p1.md", type: "create", content: "A" }]
        };
        const propB = {
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
            patches: [{ path: "docs/mee/proposal-p2.md", type: "create", content: "B" }]
        };
        const agentA = new mee_negotiation_agent_js_1.MeeNegotiationAgent(propA, patchA);
        const agentB = new mee_negotiation_agent_js_1.MeeNegotiationAgent(propB, patchB);
        const engine = new mee_negotiation_engine_js_1.MeeNegotiationEngine();
        const agents = [agentB, agentA];
        engine.runUntilStable(agents);
        const transcript = engine.getTranscript();
        (0, vitest_1.expect)(transcript.length).toBeGreaterThan(0);
        const consensus = engine.produceConsensusPlan(agents);
        (0, vitest_1.expect)(consensus.length).toBe(2);
        (0, vitest_1.expect)(consensus[0].id).toBe("p1");
        (0, vitest_1.expect)(consensus[1].id).toBe("p2");
    });
});
//# sourceMappingURL=mee-negotiation.test.js.map