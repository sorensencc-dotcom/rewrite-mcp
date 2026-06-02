/**
 * tests/arl/TemporalConsistencyEngine.test.ts
 * Test suite for TemporalConsistencyEngine.
 */

import { computeTemporalConsistency } from '../../src/reasoning/arl/engine/TemporalConsistencyEngine';
import { ReasoningPacket, ArlCandidate } from '../../src/reasoning/arl/contracts/ReasoningPacket';

describe('TemporalConsistencyEngine', () => {
  const mockCandidate: ArlCandidate = {
    type: 'timeline',
    content: 'Test temporal expansion',
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

  it('returns deterministic zeroed structure for empty expansions', () => {
    const result = computeTemporalConsistency(mockPacket);

    expect(result).toEqual({
      orderingScore: 0.5,
      causalityScore: 0.5,
      conflictCount: 0,
      driftTemporalImpact: 0,
      overall: 0.5
    });
  });

  it('returns structure with zero conflicts when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeTemporalConsistency(packet);

    expect(result.conflictCount).toBe(0);
  });

  it('returns composite overall score as average of ordering and causality', () => {
    const result = computeTemporalConsistency(mockPacket);

    const expectedOverall = (result.orderingScore + result.causalityScore) / 2;
    expect(result.overall).toBe(expectedOverall);
  });

  it('handles packet with recent expansions', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'timeline', content: 'First expansion', metadata: {} },
          { type: 'timeline', content: 'Second expansion', metadata: {} }
        ]
      }
    };

    const result = computeTemporalConsistency(packet);

    expect(result).toBeDefined();
    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('returns drift temporal impact within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        driftScore: 0.5
      }
    };

    const result = computeTemporalConsistency(packet);

    expect(result.driftTemporalImpact).toBeGreaterThanOrEqual(-1);
    expect(result.driftTemporalImpact).toBeLessThanOrEqual(1);
  });

  it('handles missing drift score gracefully', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        driftScore: undefined as any
      }
    };

    const result = computeTemporalConsistency(packet);

    expect(result.driftTemporalImpact).toBe(0);
  });
});
