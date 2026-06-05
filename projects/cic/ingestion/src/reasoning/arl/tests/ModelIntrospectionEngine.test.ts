import { describe, it, expect, beforeEach } from 'vitest';
import { ModelIntrospectionEngine } from '../engine/ModelIntrospectionEngine';
import { makeIntrospectable, makeIncoherentExpansion } from './fixtures/IntrospectionFixtures';

describe('Batch 3, Phase 7.19: Model Introspection Engine', () => {
  let engine: ModelIntrospectionEngine;

  beforeEach(() => {
    engine = new ModelIntrospectionEngine();
  });

  describe('Introspection trace generation', () => {
    it('should generate subsystem traces for introspectable expansion', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      expect(trace.subsystemTraces).toHaveLength(5);
      expect(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('coherence');
      expect(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('semantic');
      expect(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('temporal');
      expect(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('causal');
      expect(trace.subsystemTraces.map((t) => t.subsystemId)).toContain('narrative');
    });

    it('should score subsystems appropriately', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      const coherenceTrace = trace.subsystemTraces.find((t) => t.subsystemId === 'coherence');
      expect(coherenceTrace?.score).toBeGreaterThan(0.8);
    });

    it('should include reasoning details in traces', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      trace.subsystemTraces.forEach((t) => {
        expect(t.reasoning).toBeDefined();
        expect(t.reasoning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Entity alignment generation', () => {
    it('should generate entity alignments', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      expect(trace.entityAlignments.length).toBeGreaterThan(0);
    });

    it('should compute alignment scores from semantic signals', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      const primaryAlignment = trace.entityAlignments.find((e) => e.entityId === 'primary');
      expect(primaryAlignment?.alignmentScore).toBeCloseTo(expansion.semanticSignals.similarity, 1);
    });
  });

  describe('Causal chain generation', () => {
    it('should detect causal loops when present', () => {
      const expansion = {
        ...makeIntrospectable(),
        causalSignals: { depthScore: 0.8, loopDetection: 0.7 },
      };

      const trace = engine.introspect(expansion);

      expect(trace.causalChains.length).toBeGreaterThan(1);
      const hasLoop = trace.causalChains.some((c) => c.target === 'node-1' && c.nodeId === 'node-2');
      expect(hasLoop).toBe(true);
    });

    it('should generate linear causal chains for loop-free expansions', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      expect(trace.causalChains.length).toBeGreaterThan(0);
    });
  });

  describe('Temporal ordering generation', () => {
    it('should generate temporal ordering for events', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      expect(trace.temporalOrderings.length).toBeGreaterThan(0);
      expect(trace.temporalOrderings[0].timestamp).toBe(expansion.timestamp);
    });

    it('should assign sequence positions', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      trace.temporalOrderings.forEach((t) => {
        expect(t.sequencePosition).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle incoherent expansions', () => {
      const expansion = makeIncoherentExpansion();

      const trace = engine.introspect(expansion);

      expect(trace.subsystemTraces.length).toBe(5);
      const coherenceTrace = trace.subsystemTraces.find((t) => t.subsystemId === 'coherence');
      expect(coherenceTrace?.score).toBeLessThan(0.5);
    });

    it('should maintain trace integrity across all components', () => {
      const expansion = makeIntrospectable();

      const trace = engine.introspect(expansion);

      expect(trace.id).toBe(expansion.id);
      expect(trace.timestamp).toBe(expansion.timestamp);
      expect(trace.subsystemTraces).toBeDefined();
      expect(trace.entityAlignments).toBeDefined();
      expect(trace.causalChains).toBeDefined();
      expect(trace.temporalOrderings).toBeDefined();
    });
  });
});
