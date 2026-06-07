/**
 * tests/arl/SemanticAlignmentEngine.test.ts
 * Test suite for SemanticAlignmentEngine.
 */

import { computeSemanticAlignment } from '../../src/reasoning/arl/engine/SemanticAlignmentEngine';
import { ReasoningPacket, ArlCandidate } from '../../src/reasoning/arl/contracts/ReasoningPacket';

describe('SemanticAlignmentEngine', () => {
  const mockCandidate: ArlCandidate = {
    type: 'semantic',
    content: 'Test expansion content',
    metadata: {}
  };

  const mockPacket: ReasoningPacket = {
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
    const result = computeSemanticAlignment(mockPacket);

    expect(result).toEqual({
      recognizedEntities: [],
      unrecognizedEntities: [],
      relationshipMatches: 0.5,
      entityCoverage: 0.5,
      overall: 0.5
    });
  });

  it('returns structure with empty entities when semantic context is missing', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        semanticMap: undefined as any
      }
    };

    const result = computeSemanticAlignment(packet);

    expect(result.recognizedEntities).toEqual([]);
    expect(result.unrecognizedEntities).toEqual([]);
  });

  it('returns composite overall score as average of components', () => {
    const result = computeSemanticAlignment(mockPacket);

    const expectedOverall = (result.relationshipMatches + result.entityCoverage) / 2;
    expect(result.overall).toBe(expectedOverall);
  });

  it('handles packet with populated semantic map', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        semanticMap: {
          entity1: { type: 'concept' },
          entity2: { type: 'person' }
        }
      }
    };

    const result = computeSemanticAlignment(packet);

    expect(result).toBeDefined();
    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });
});
