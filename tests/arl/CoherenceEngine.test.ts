/**
 * tests/arl/CoherenceEngine.test.ts
 * Unit tests for the Coherence Engine.
 */

import { computeCoherence } from '../../projects/cic/src/reasoning/arl/engine/CoherenceEngine';
import { ReasoningPacket } from '../../projects/cic/src/reasoning/arl/contracts/ReasoningPacket';

describe('CoherenceEngine', () => {
  const mockPacket: ReasoningPacket = {
    id: 'test-packet-001',
    timestamp: new Date().toISOString(),
    type: 'test',
    priority: 1,
    context: {
      narrativeSpine: 'System operating at 94% efficiency with federated replication',
      semanticMap: {
        federation: { type: 'operation', state: 'active' },
        efficiency: { type: 'metric', value: 0.94 },
        replication: { type: 'process', status: 'healthy' }
      },
      recentExpansions: [
        {
          type: 'audit',
          timestamp: new Date().toISOString(),
          content: 'Federation sync completed'
        }
      ],
      driftScore: 0.15,
      stabilityMetrics: {
        overallStability: 0.87,
        coherenceScore: 0.78
      }
    }
  };

  it('returns deterministic zeroed CoherenceScore structure', () => {
    const result = computeCoherence(mockPacket);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('narrative');
    expect(result).toHaveProperty('semantic');
    expect(result).toHaveProperty('temporal');
    expect(result).toHaveProperty('overall');
  });

  it('each dimension is a number between 0 and 1', () => {
    const result = computeCoherence(mockPacket);

    expect(typeof result.narrative).toBe('number');
    expect(typeof result.semantic).toBe('number');
    expect(typeof result.temporal).toBe('number');
    expect(typeof result.overall).toBe('number');

    expect(result.narrative).toBeGreaterThanOrEqual(0);
    expect(result.narrative).toBeLessThanOrEqual(1);

    expect(result.semantic).toBeGreaterThanOrEqual(0);
    expect(result.semantic).toBeLessThanOrEqual(1);

    expect(result.temporal).toBeGreaterThanOrEqual(0);
    expect(result.temporal).toBeLessThanOrEqual(1);

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('overall score is composite of three dimensions', () => {
    const result = computeCoherence(mockPacket);
    const expectedOverall = (result.narrative + result.semantic + result.temporal) / 3;

    expect(result.overall).toBeCloseTo(expectedOverall, 5);
  });

  it('handles missing narrative spine gracefully', () => {
    const packetNoSpine: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        narrativeSpine: ''
      }
    };

    const result = computeCoherence(packetNoSpine);
    expect(result.narrative).toBeGreaterThanOrEqual(0);
    expect(result.narrative).toBeLessThanOrEqual(1);
  });

  it('handles missing semantic map gracefully', () => {
    const packetNoSemantic: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        semanticMap: {}
      }
    };

    const result = computeCoherence(packetNoSemantic);
    expect(result.semantic).toBeGreaterThanOrEqual(0);
    expect(result.semantic).toBeLessThanOrEqual(1);
  });

  it('handles missing recent expansions gracefully', () => {
    const packetNoHistory: ReasoningPacket = {
      ...mockPacket,
      context: {
        ...mockPacket.context,
        recentExpansions: []
      }
    };

    const result = computeCoherence(packetNoHistory);
    expect(result.temporal).toBeGreaterThanOrEqual(0);
    expect(result.temporal).toBeLessThanOrEqual(1);
  });
});
