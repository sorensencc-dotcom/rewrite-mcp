/**
 * tests/arl/CausalReasoningEngine.test.ts
 * Test suite for CausalReasoningEngine.
 */

import { computeCausalReasoning } from '../../src/reasoning/arl/engine/CausalReasoningEngine';
import { ReasoningPacket, ArlCandidate } from '../../src/reasoning/arl/contracts/ReasoningPacket';

describe('CausalReasoningEngine', () => {
  const mockCandidate: ArlCandidate = {
    type: 'narrative',
    content: 'Test causal expansion',
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
    const result = computeCausalReasoning(mockPacket);

    expect(result).toEqual({
      causalLinks: [],
      missingPrerequisites: [],
      violatedDependencies: [],
      causalStrength: 0,
      conflictCount: 0,
      overall: 0
    });
  });

  it('returns empty causal links when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result.causalLinks).toEqual([]);
  });

  it('returns empty prerequisites when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result.missingPrerequisites).toEqual([]);
  });

  it('returns zero conflict count when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result.conflictCount).toBe(0);
  });

  it('handles packet with recent expansions', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'First expansion', metadata: {} },
          { type: 'narrative', content: 'Second expansion', metadata: {} }
        ]
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result).toBeDefined();
    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('returns causal strength within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Expansion with causal context', metadata: {} }
        ]
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result.causalStrength).toBeGreaterThanOrEqual(0);
    expect(result.causalStrength).toBeLessThanOrEqual(1);
  });

  it('returns overall score as weighted composite', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Expansion', metadata: {} }
        ]
      }
    };

    const result = computeCausalReasoning(packet);

    const conflictPenalty = Math.min(result.conflictCount * 0.1, 1);
    const expectedOverall = result.causalStrength * (1 - conflictPenalty);
    expect(result.overall).toBeCloseTo(expectedOverall, 5);
  });

  it('returns empty violated dependencies when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeCausalReasoning(packet);

    expect(result.violatedDependencies).toEqual([]);
  });
});
