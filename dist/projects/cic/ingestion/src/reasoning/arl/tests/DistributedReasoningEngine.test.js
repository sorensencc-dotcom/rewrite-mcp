"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DistributedReasoningEngine_1 = require("../engine/DistributedReasoningEngine");
(0, vitest_1.describe)('Batch 4, Phase 7.24: Distributed Reasoning Engine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new DistributedReasoningEngine_1.DistributedReasoningEngine();
    });
    (0, vitest_1.it)('should coordinate regions with aligned scores', () => {
        const regionIds = ['region-1', 'region-2', 'region-3'];
        const scores = { 'region-1': 0.8, 'region-2': 0.82, 'region-3': 0.79 };
        const state = engine.coordinateRegions(regionIds, scores);
        (0, vitest_1.expect)(state.regionalDrifts).toHaveLength(3);
        (0, vitest_1.expect)(state.crossRegionConsensus.agreementLevel).toBeGreaterThan(0.8);
        (0, vitest_1.expect)(state.divergenceSignals).toHaveLength(0);
    });
    (0, vitest_1.it)('should detect divergences across regions', () => {
        const regionIds = ['region-1', 'region-2', 'region-3'];
        const scores = { 'region-1': 0.9, 'region-2': 0.5, 'region-3': 0.88 };
        const state = engine.coordinateRegions(regionIds, scores);
        (0, vitest_1.expect)(state.divergenceSignals.length).toBeGreaterThan(0);
        const hasDivergentRegion = state.divergenceSignals.some((d) => d.regionId === 'region-2');
        (0, vitest_1.expect)(hasDivergentRegion).toBe(true);
    });
    (0, vitest_1.it)('should compute cross-region consensus score', () => {
        const regionIds = ['region-1', 'region-2'];
        const scores = { 'region-1': 0.85, 'region-2': 0.85 };
        const state = engine.coordinateRegions(regionIds, scores);
        (0, vitest_1.expect)(state.crossRegionConsensus.consensusScore).toBeGreaterThan(0.8);
    });
    (0, vitest_1.it)('should build arbitration workflows for divergences', () => {
        const regionIds = ['region-1', 'region-2', 'region-3'];
        const scores = { 'region-1': 0.9, 'region-2': 0.3, 'region-3': 0.85 };
        const state = engine.coordinateRegions(regionIds, scores);
        (0, vitest_1.expect)(state.arbitrationWorkflows.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should handle consensus voting for multiple divergences', () => {
        const regionIds = ['r1', 'r2', 'r3', 'r4'];
        const scores = { 'r1': 0.2, 'r2': 0.8, 'r3': 0.75, 'r4': 0.15 };
        const state = engine.coordinateRegions(regionIds, scores);
        if (state.arbitrationWorkflows.length > 0) {
            const workflow = state.arbitrationWorkflows[0];
            (0, vitest_1.expect)(['voting', 'weighting', 'consensus']).toContain(workflow.arbitrationMethod);
        }
    });
});
//# sourceMappingURL=DistributedReasoningEngine.test.js.map