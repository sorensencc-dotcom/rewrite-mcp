"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CompositeReasoningEngine_1 = require("../../src/reasoning/arl/engine/CompositeReasoningEngine");
(0, vitest_1.describe)('CompositeReasoningEngine', () => {
    (0, vitest_1.it)('returns deterministic structure with mapped subsystem scores', () => {
        const coherence = { narrative: 0, semantic: 0, temporal: 0, overall: 0.1 };
        const semantic = {
            recognizedEntities: [],
            unrecognizedEntities: [],
            relationshipMatches: 0,
            entityCoverage: 0,
            overall: 0.2
        };
        const temporal = {
            orderingScore: 0,
            causalityScore: 0,
            conflictCount: 0,
            driftTemporalImpact: 0,
            overall: 0.3
        };
        const causal = {
            causalLinks: [],
            missingPrerequisites: [],
            violatedDependencies: [],
            causalStrength: 0,
            conflictCount: 0,
            overall: 0.4
        };
        const narrative = {
            reinforcementScore: 0,
            dilutionScore: 0,
            contradictionScore: 0,
            noveltyScore: 0,
            riskScore: 0,
            overall: 0.5
        };
        const result = (0, CompositeReasoningEngine_1.computeCompositeReasoning)(coherence, semantic, temporal, causal, narrative);
        (0, vitest_1.expect)(result).toEqual({
            coherence: 0.1,
            semantic: 0.2,
            temporal: 0.3,
            causal: 0.4,
            narrative: 0.5,
            overall: 0
        });
    });
});
//# sourceMappingURL=CompositeReasoningEngine.test.js.map