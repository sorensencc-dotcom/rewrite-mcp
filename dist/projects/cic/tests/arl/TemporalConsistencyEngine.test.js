"use strict";
/**
 * tests/arl/TemporalConsistencyEngine.test.ts
 * Test suite for TemporalConsistencyEngine.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const TemporalConsistencyEngine_1 = require("../../src/reasoning/arl/engine/TemporalConsistencyEngine");
describe('TemporalConsistencyEngine', () => {
    const mockCandidate = {
        type: 'timeline',
        content: 'Test temporal expansion',
        metadata: {}
    };
    const mockPacket = {
        candidate: mockCandidate,
        context: {
            narrativeSpine: 'Test narrative',
            artifactsPlaneIndex: {},
            semanticMap: {},
            recentExpansions: [],
            driftScore: 0,
            stabilityMetrics: {}
        }
    };
    it('returns deterministic zeroed structure for empty expansions', () => {
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(mockPacket);
        expect(result).toEqual({
            orderingScore: 0.5,
            causalityScore: 0.5,
            conflictCount: 0,
            driftTemporalImpact: 0,
            overall: 0.5
        });
    });
    it('returns structure with zero conflicts when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(packet);
        expect(result.conflictCount).toBe(0);
    });
    it('returns composite overall score as average of ordering and causality', () => {
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(mockPacket);
        const expectedOverall = (result.orderingScore + result.causalityScore) / 2;
        expect(result.overall).toBe(expectedOverall);
    });
    it('handles packet with recent expansions', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'timeline', content: 'First expansion', metadata: {} },
                    { type: 'timeline', content: 'Second expansion', metadata: {} }
                ]
            }
        };
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(packet);
        expect(result).toBeDefined();
        expect(result.overall).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
    });
    it('returns drift temporal impact within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                driftScore: 0.5
            }
        };
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(packet);
        expect(result.driftTemporalImpact).toBeGreaterThanOrEqual(-1);
        expect(result.driftTemporalImpact).toBeLessThanOrEqual(1);
    });
    it('handles missing drift score gracefully', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                driftScore: undefined
            }
        };
        const result = (0, TemporalConsistencyEngine_1.computeTemporalConsistency)(packet);
        expect(result.driftTemporalImpact).toBe(0);
    });
});
//# sourceMappingURL=TemporalConsistencyEngine.test.js.map