"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DriftImpactCalculator_1 = require("../../src/reasoning/arl/engine/DriftImpactCalculator");
(0, vitest_1.describe)('DriftImpactCalculator', () => {
    (0, vitest_1.it)('returns deterministic structure with zeroed drift components', () => {
        const semantic = {
            recognizedEntities: [],
            unrecognizedEntities: [],
            relationshipMatches: 0,
            entityCoverage: 0,
            overall: 0.5
        };
        const temporal = {
            orderingScore: 0,
            causalityScore: 0,
            conflictCount: 0,
            driftTemporalImpact: 0,
            overall: 0.5
        };
        const narrative = {
            reinforcementScore: 0,
            dilutionScore: 0,
            contradictionScore: 0,
            noveltyScore: 0,
            riskScore: 0,
            overall: 0.5
        };
        const causal = {
            causalLinks: [],
            missingPrerequisites: [],
            violatedDependencies: [],
            causalStrength: 0,
            conflictCount: 0,
            overall: 0.5
        };
        const composite = {
            coherence: 0.5,
            semantic: 0.5,
            temporal: 0.5,
            causal: 0.5,
            narrative: 0.5,
            overall: 0
        };
        const result = (0, DriftImpactCalculator_1.computeDriftImpact)(semantic, temporal, narrative, causal, composite);
        (0, vitest_1.expect)(result).toEqual({
            semanticDrift: 0,
            temporalDrift: 0,
            narrativeDrift: 0,
            causalDrift: 0,
            compositeDrift: 0,
            overall: 0
        });
    });
});
//# sourceMappingURL=DriftImpactCalculator.test.js.map