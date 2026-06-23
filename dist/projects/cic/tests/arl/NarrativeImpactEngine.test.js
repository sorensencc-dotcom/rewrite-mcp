"use strict";
/**
 * tests/arl/NarrativeImpactEngine.test.ts
 * Test suite for NarrativeImpactEngine.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const NarrativeImpactEngine_1 = require("../../src/reasoning/arl/engine/NarrativeImpactEngine");
describe('NarrativeImpactEngine', () => {
    const mockCandidate = {
        type: 'narrative',
        content: 'Test narrative expansion',
        metadata: {}
    };
    const mockPacket = {
        candidate: mockCandidate,
        context: {
            narrativeSpine: 'Test narrative spine',
            artifactsPlaneIndex: {},
            semanticMap: {},
            recentExpansions: [],
            driftScore: 0,
            stabilityMetrics: {}
        }
    };
    it('returns deterministic zeroed structure for empty expansions', () => {
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(mockPacket);
        expect(result).toEqual({
            reinforcementScore: 0,
            dilutionScore: 0,
            contradictionScore: 0,
            noveltyScore: 0,
            riskScore: 0,
            overall: 0
        });
    });
    it('returns zero reinforcement when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.reinforcementScore).toBe(0);
    });
    it('returns zero dilution when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.dilutionScore).toBe(0);
    });
    it('returns zero contradiction when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.contradictionScore).toBe(0);
    });
    it('handles packet with recent expansions', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'First narrative expansion', metadata: {} },
                    { type: 'narrative', content: 'Second narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result).toBeDefined();
        expect(result.overall).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
    });
    it('returns reinforcement score within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.reinforcementScore).toBeGreaterThanOrEqual(0);
        expect(result.reinforcementScore).toBeLessThanOrEqual(1);
    });
    it('returns overall score as weighted composite', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        const contradictionPenalty = Math.min(result.contradictionScore + result.dilutionScore, 1);
        const expectedOverall = result.reinforcementScore * (1 - contradictionPenalty);
        expect(result.overall).toBeCloseTo(expectedOverall, 5);
    });
    it('returns zero novelty when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.noveltyScore).toBe(0);
    });
    it('returns zero risk when no history', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: []
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.riskScore).toBe(0);
    });
    it('returns dilution score within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.dilutionScore).toBeGreaterThanOrEqual(0);
        expect(result.dilutionScore).toBeLessThanOrEqual(1);
    });
    it('returns contradiction score within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.contradictionScore).toBeGreaterThanOrEqual(0);
        expect(result.contradictionScore).toBeLessThanOrEqual(1);
    });
    it('returns novelty score within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.noveltyScore).toBeGreaterThanOrEqual(0);
        expect(result.noveltyScore).toBeLessThanOrEqual(1);
    });
    it('returns risk score within valid range', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                recentExpansions: [
                    { type: 'narrative', content: 'Narrative expansion', metadata: {} }
                ]
            }
        };
        const result = (0, NarrativeImpactEngine_1.computeNarrativeImpact)(packet);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
    });
});
//# sourceMappingURL=NarrativeImpactEngine.test.js.map