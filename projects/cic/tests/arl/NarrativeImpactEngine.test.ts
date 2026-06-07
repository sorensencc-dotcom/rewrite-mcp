/**
 * tests/arl/NarrativeImpactEngine.test.ts
 * Test suite for NarrativeImpactEngine.
 */

import { computeNarrativeImpact } from '../../src/reasoning/arl/engine/NarrativeImpactEngine';
import { ReasoningPacket, ArlCandidate } from '../../src/reasoning/arl/contracts/ReasoningPacket';

describe('NarrativeImpactEngine', () => {
  const mockCandidate: ArlCandidate = {
    type: 'narrative',
    content: 'Test narrative expansion',
    metadata: {}
  };

  const mockPacket: ReasoningPacket = {
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
    const result = computeNarrativeImpact(mockPacket);

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
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.reinforcementScore).toBe(0);
  });

  it('returns zero dilution when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.dilutionScore).toBe(0);
  });

  it('returns zero contradiction when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.contradictionScore).toBe(0);
  });

  it('handles packet with recent expansions', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'First narrative expansion', metadata: {} },
          { type: 'narrative', content: 'Second narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result).toBeDefined();
    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('returns reinforcement score within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.reinforcementScore).toBeGreaterThanOrEqual(0);
    expect(result.reinforcementScore).toBeLessThanOrEqual(1);
  });

  it('returns overall score as weighted composite', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    const contradictionPenalty = Math.min(result.contradictionScore + result.dilutionScore, 1);
    const expectedOverall = result.reinforcementScore * (1 - contradictionPenalty);
    expect(result.overall).toBeCloseTo(expectedOverall, 5);
  });

  it('returns zero novelty when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.noveltyScore).toBe(0);
  });

  it('returns zero risk when no history', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.riskScore).toBe(0);
  });

  it('returns dilution score within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.dilutionScore).toBeGreaterThanOrEqual(0);
    expect(result.dilutionScore).toBeLessThanOrEqual(1);
  });

  it('returns contradiction score within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.contradictionScore).toBeGreaterThanOrEqual(0);
    expect(result.contradictionScore).toBeLessThanOrEqual(1);
  });

  it('returns novelty score within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.noveltyScore).toBeGreaterThanOrEqual(0);
    expect(result.noveltyScore).toBeLessThanOrEqual(1);
  });

  it('returns risk score within valid range', () => {
    const packet: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: [
          { type: 'narrative', content: 'Narrative expansion', metadata: {} }
        ]
      }
    };

    const result = computeNarrativeImpact(packet);

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
  });
});
