import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryConsistencyValidator } from '../engine/MemoryConsistencyValidator';
import {
  makeConsistentMemorySnapshot,
  makeInconsistentMemorySnapshot,
  makeEmptyMemorySnapshot,
  makeMemorySnapshotWithMissingEntity,
} from './fixtures/MemoryFixtures';
import {
  makeStableExpansion,
  makeContradictoryExpansion,
} from './fixtures/ExpansionFixtures';

describe('Batch 2, Phase 7.15: Memory Consistency Validator', () => {
  let validator: MemoryConsistencyValidator;

  beforeEach(() => {
    validator = new MemoryConsistencyValidator();
  });

  describe('Temporal consistency', () => {
    it('should accept memory with consistent timeline', () => {
      const memory = makeConsistentMemorySnapshot();
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      expect(result.alignmentScore).toBeGreaterThan(0.8);
      expect(result.violations.filter((v) => v.type === 'TEMPORAL')).toHaveLength(
        0
      );
    });

    it('should detect out-of-order events', () => {
      const memory = makeInconsistentMemorySnapshot();
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      const temporalViolations = result.violations.filter(
        (v) => v.type === 'TEMPORAL'
      );
      expect(temporalViolations.length).toBeGreaterThan(0);
      expect(result.alignmentScore).toBeLessThan(0.8);
    });
  });

  describe('Contradiction detection', () => {
    it('should detect active/inactive contradictions', () => {
      const memory = {
        id: 'contradiction-test',
        version: '1.0',
        capturedAt: new Date().toISOString(),
        entities: [
          {
            entityId: 'entity-1',
            events: [
              {
                timestamp: '2026-01-01T10:00:00Z',
                description: 'Entity is active',
              },
              {
                timestamp: '2026-01-01T11:00:00Z',
                description: 'Entity is inactive',
              },
            ],
          },
        ],
      };
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      const contradictions = result.violations.filter(
        (v) => v.type === 'CONTRADICTION'
      );
      expect(contradictions.length).toBeGreaterThan(0);
    });
  });

  describe('Alignment scoring', () => {
    it('should compute high alignment for perfect memory', () => {
      const memory = makeConsistentMemorySnapshot();
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      expect(result.alignmentScore).toBeCloseTo(1.0, 1);
    });

    it('should compute low alignment for severely inconsistent memory', () => {
      const memory = makeInconsistentMemorySnapshot();
      const expansion = makeContradictoryExpansion();

      const result = validator.validate(expansion, memory);

      expect(result.alignmentScore).toBeLessThan(0.5);
    });

    it('should handle empty memory gracefully', () => {
      const memory = makeEmptyMemorySnapshot();
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      expect(result.alignmentScore).toBe(1.0);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Missing entity detection', () => {
    it('should flag entities with no events', () => {
      const memory = makeMemorySnapshotWithMissingEntity();
      const expansion = makeStableExpansion();

      const result = validator.validate(expansion, memory);

      const missingViolations = result.violations.filter(
        (v) => v.type === 'MISSING'
      );
      expect(missingViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Drift vector computation', () => {
    it('should compute positive drift for degradation', () => {
      const previous = {
        alignmentScore: 0.9,
        driftVector: 0,
        violations: [],
      };

      const current = {
        alignmentScore: 0.7,
        driftVector: 0,
        violations: [
          { entityId: 'e1', type: 'TEMPORAL' as const, details: 'test' },
        ],
      };

      const drift = validator.computeDriftVector(previous, current);

      expect(drift).toBeGreaterThan(0);
    });

    it('should compute negative drift for improvement', () => {
      const previous = {
        alignmentScore: 0.5,
        driftVector: 0,
        violations: [
          { entityId: 'e1', type: 'TEMPORAL' as const, details: 'test' },
          { entityId: 'e2', type: 'CONTRADICTION' as const, details: 'test' },
        ],
      };

      const current = {
        alignmentScore: 0.85,
        driftVector: 0,
        violations: [],
      };

      const drift = validator.computeDriftVector(previous, current);

      expect(drift).toBeLessThan(0);
    });

    it('should compute zero drift for no change', () => {
      const result = {
        alignmentScore: 0.75,
        driftVector: 0,
        violations: [],
      };

      const drift = validator.computeDriftVector(result, result);

      expect(drift).toBe(0);
    });
  });
});
