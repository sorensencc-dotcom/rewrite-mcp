"use strict";
/**
 * tests/arl/SemanticAlignmentEngine.test.ts
 * Test suite for SemanticAlignmentEngine.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SemanticAlignmentEngine_1 = require("../../src/reasoning/arl/engine/SemanticAlignmentEngine");
describe('SemanticAlignmentEngine', () => {
    const mockCandidate = {
        type: 'semantic',
        content: 'Test expansion content',
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
    it('returns deterministic zeroed structure for empty semantic map', () => {
        const result = (0, SemanticAlignmentEngine_1.computeSemanticAlignment)(mockPacket);
        expect(result).toEqual({
            recognizedEntities: [],
            unrecognizedEntities: [],
            relationshipMatches: 0.5,
            entityCoverage: 0.5,
            overall: 0.5
        });
    });
    it('returns structure with empty entities when semantic context is missing', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                semanticMap: undefined
            }
        };
        const result = (0, SemanticAlignmentEngine_1.computeSemanticAlignment)(packet);
        expect(result.recognizedEntities).toEqual([]);
        expect(result.unrecognizedEntities).toEqual([]);
    });
    it('returns composite overall score as average of components', () => {
        const result = (0, SemanticAlignmentEngine_1.computeSemanticAlignment)(mockPacket);
        const expectedOverall = (result.relationshipMatches + result.entityCoverage) / 2;
        expect(result.overall).toBe(expectedOverall);
    });
    it('handles packet with populated semantic map', () => {
        const packet = {
            ...mockPacket,
            context: {
                ...mockPacket.context,
                semanticMap: {
                    entity1: { type: 'concept' },
                    entity2: { type: 'person' }
                }
            }
        };
        const result = (0, SemanticAlignmentEngine_1.computeSemanticAlignment)(packet);
        expect(result).toBeDefined();
        expect(result.overall).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
    });
});
//# sourceMappingURL=SemanticAlignmentEngine.test.js.map