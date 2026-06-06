import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryConsistencyValidator } from '../../../../src/reasoning/arl/memory/engine/MemoryConsistencyValidator';
import {
  MemorySnapshot,
  ExpansionContext,
} from '../../../../src/reasoning/arl/memory/contracts/MemorySnapshot';
import { EntityTimeline } from '../../../../src/reasoning/arl/memory/contracts/EntityTimeline';

describe('MemoryConsistencyValidator — Phase 7.15', () => {
  let validator: MemoryConsistencyValidator;
  let baseMemory: MemorySnapshot;
  let baseEntity: EntityTimeline;

  beforeEach(() => {
    validator = new MemoryConsistencyValidator();

    baseEntity = {
      entityId: 'person-alice',
      entityType: 'person',
      firstMentioned: '2024-01-01T00:00:00Z',
      lastUpdated: '2026-06-05T00:00:00Z',
      events: [
        {
          timestamp: '2024-01-01T00:00:00Z',
          description: 'Born in Boston',
          source: 'historical',
          confidence: 0.95,
        },
        {
          timestamp: '2024-09-15T00:00:00Z',
          description: 'Graduated from MIT',
          source: 'historical',
          confidence: 0.9,
        },
        {
          timestamp: '2025-01-15T00:00:00Z',
          description: 'Hired at TechCorp',
          source: 'historical',
          confidence: 0.85,
        },
      ],
      attributes: {
        age: '22',
        location: 'Boston',
        education: 'MIT graduate',
        employment: 'TechCorp',
      },
      relationships: [
        {
          relatedEntityId: 'person-bob',
          relationshipType: 'colleague',
          confidence: 0.8,
        },
      ],
    };

    baseMemory = {
      version: '1.0',
      capturedAt: '2026-06-05T00:00:00Z',
      entities: [baseEntity],
      totalEventCount: 3,
      checksumHash: 'abc123',
    };
  });

  describe('Happy Path — Consistent Expansion', () => {
    it('should auto-approve expansion consistent with memory', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-001',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: Boston',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.9,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.violations.length).toBe(0);
      expect(report.result.alignmentScore).toBeGreaterThan(0.9);
      expect(report.result.approvalRecommendation).toBe('auto_approve');
    });

    it('should handle new consistent event', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-002',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'event',
            statement: 'Promoted to Senior Engineer at TechCorp',
            timestamp: '2026-05-01T00:00:00Z',
            confidence: 0.92,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.violations.length).toBe(0);
      expect(report.result.approvalRecommendation).toBe('auto_approve');
    });
  });

  describe('Temporal Violations', () => {
    it('should detect event before entity creation', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-003',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'event',
            statement: 'Graduated from high school',
            timestamp: '2023-06-01T00:00:00Z', // Before entity first mention
            confidence: 0.9,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      const violation = report.result.violations.find(
        (v) => v.type === 'TEMPORAL_IMPOSSIBILITY'
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('high');
    });

    it('should detect event after death', async () => {
      const memory: MemorySnapshot = {
        ...baseMemory,
        entities: [
          {
            ...baseEntity,
            events: [
              ...baseEntity.events,
              {
                timestamp: '2026-01-01T00:00:00Z',
                description: 'Passed away peacefully',
                source: 'historical',
                confidence: 0.99,
              },
            ],
          },
        ],
      };

      const expansion: ExpansionContext = {
        expansionId: 'exp-004',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'event',
            statement: 'Bought a house in Maine',
            timestamp: '2026-02-15T00:00:00Z',
            confidence: 0.85,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, memory);

      const violation = report.result.violations.find(
        (v) => v.type === 'TEMPORAL_ORDER'
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('critical');
    });
  });

  describe('Contradiction Violations', () => {
    it('should detect attribute contradiction', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-005',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: San Francisco',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      const violation = report.result.violations.find(
        (v) => v.type === 'ATTRIBUTE_CONFLICT'
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('high');
      expect(report.result.approvalRecommendation).toBe('review');
    });

    it('should detect relationship contradiction', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-006',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'relationship',
            statement: 'friend → person-bob',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.85,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      // Should detect that colleague and friend are contradictory
      const violation = report.result.violations.find(
        (v) => v.type === 'RELATIONSHIP_CONFLICT'
      );
      expect(violation).toBeDefined();
    });

    it('should allow attribute updates with same value', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-007',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'education: MIT graduate',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.violations.length).toBe(0);
      expect(report.result.alignmentScore).toBeGreaterThan(0.9);
    });
  });

  describe('Missing Entity Violations', () => {
    it('should detect reference to unknown entity', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-008',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-charlie',
            claimType: 'attribute',
            statement: 'location: Austin',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.9,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      const violation = report.result.violations.find(
        (v) => v.type === 'MISSING_ENTITY'
      );
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('high');
      expect(report.result.approvalRecommendation).toBe('review');
    });
  });

  describe('Missing Context', () => {
    it('should flag vague location claims', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-009',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'event',
            statement: 'took a trip',
            timestamp: '2026-05-20T00:00:00Z',
            confidence: 0.7,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.detailedAnalysis.contextFindings.length).toBeGreaterThan(0);
      expect(report.result.missingContext.length).toBeGreaterThan(0);
    });
  });

  describe('Alignment Scoring', () => {
    it('should compute high alignment for fully consistent expansion', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-010',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'age: 22',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'employment: TechCorp',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.alignmentScore).toBeGreaterThan(0.95);
    });

    it('should reduce alignment for violations', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-011',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: New York',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.9,
          },
          {
            entityId: 'person-unknown',
            claimType: 'attribute',
            statement: 'status: active',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.8,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.alignmentScore).toBeLessThan(0.8);
    });
  });

  describe('Drift Vector', () => {
    it('should compute zero drift for first validation of expansion', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-012',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: Boston',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.driftVector).toBe(0);
    });

    it('should detect positive drift on re-validation', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-013',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: Boston',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.9,
          },
        ],
        sourcePhase: '7.12',
      };

      // First validation
      const report1 = await validator.validate(expansion, baseMemory);
      const score1 = report1.result.alignmentScore;

      // Second validation with improved consistency
      const report2 = await validator.validate(expansion, baseMemory);
      const drift = report2.result.driftVector;

      expect(drift).toBe(0); // Same expansion, same result
    });
  });

  describe('Approval Recommendations', () => {
    it('should auto-approve fully consistent expansions', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-014',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'age: 22',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.approvalRecommendation).toBe('auto_approve');
    });

    it('should request review for marginal cases', async () => {
      const expansion: ExpansionContext = {
        expansionId: 'exp-015',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: Boston',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.9,
          },
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'location: San Francisco',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.85,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, baseMemory);

      expect(report.result.approvalRecommendation).toBe('review');
    });

    it('should reject expansions with critical violations', async () => {
      const memory: MemorySnapshot = {
        ...baseMemory,
        entities: [
          {
            ...baseEntity,
            events: [
              ...baseEntity.events,
              {
                timestamp: '2026-01-01T00:00:00Z',
                description: 'Died',
                source: 'historical',
                confidence: 0.99,
              },
            ],
          },
        ],
      };

      const expansion: ExpansionContext = {
        expansionId: 'exp-016',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'event',
            statement: 'Started new job at Google',
            timestamp: '2026-02-01T00:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const report = await validator.validate(expansion, memory);

      expect(report.result.approvalRecommendation).toBe('reject');
    });
  });

  describe('Statistics', () => {
    it('should track consistency statistics across validations', async () => {
      const exp1: ExpansionContext = {
        expansionId: 'exp-stat-1',
        timestamp: '2026-06-05T12:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'age: 22',
            timestamp: '2026-06-05T12:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      const exp2: ExpansionContext = {
        expansionId: 'exp-stat-2',
        timestamp: '2026-06-05T13:00:00Z',
        claims: [
          {
            entityId: 'person-alice',
            claimType: 'attribute',
            statement: 'employment: TechCorp',
            timestamp: '2026-06-05T13:00:00Z',
            confidence: 0.95,
          },
        ],
        sourcePhase: '7.12',
      };

      await validator.validate(exp1, baseMemory);
      await validator.validate(exp2, baseMemory);

      const stats = validator.getConsistencyStats();

      expect(stats.validationsRun).toBe(2);
      expect(stats.avgAlignment).toBeGreaterThan(0.9);
      expect(stats.violationRate).toBe(0);
    });
  });
});
