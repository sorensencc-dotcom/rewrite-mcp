"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MemoryConsistencyValidator_1 = require("../../../../src/reasoning/arl/memory/engine/MemoryConsistencyValidator");
(0, vitest_1.describe)('MemoryConsistencyValidator — Phase 7.15', () => {
    let validator;
    let baseMemory;
    let baseEntity;
    (0, vitest_1.beforeEach)(() => {
        validator = new MemoryConsistencyValidator_1.MemoryConsistencyValidator();
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
    (0, vitest_1.describe)('Happy Path — Consistent Expansion', () => {
        (0, vitest_1.it)('should auto-approve expansion consistent with memory', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.violations.length).toBe(0);
            (0, vitest_1.expect)(report.result.alignmentScore).toBeGreaterThan(0.9);
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('auto_approve');
        });
        (0, vitest_1.it)('should handle new consistent event', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.violations.length).toBe(0);
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('auto_approve');
        });
    });
    (0, vitest_1.describe)('Temporal Violations', () => {
        (0, vitest_1.it)('should detect event before entity creation', async () => {
            const expansion = {
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
            const violation = report.result.violations.find((v) => v.type === 'TEMPORAL_IMPOSSIBILITY');
            (0, vitest_1.expect)(violation).toBeDefined();
            (0, vitest_1.expect)(violation?.severity).toBe('high');
        });
        (0, vitest_1.it)('should detect event after death', async () => {
            const memory = {
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
            const expansion = {
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
            const violation = report.result.violations.find((v) => v.type === 'TEMPORAL_ORDER');
            (0, vitest_1.expect)(violation).toBeDefined();
            (0, vitest_1.expect)(violation?.severity).toBe('critical');
        });
    });
    (0, vitest_1.describe)('Contradiction Violations', () => {
        (0, vitest_1.it)('should detect attribute contradiction', async () => {
            const expansion = {
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
            const violation = report.result.violations.find((v) => v.type === 'ATTRIBUTE_CONFLICT');
            (0, vitest_1.expect)(violation).toBeDefined();
            (0, vitest_1.expect)(violation?.severity).toBe('high');
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('review');
        });
        (0, vitest_1.it)('should detect relationship contradiction', async () => {
            const expansion = {
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
            const violation = report.result.violations.find((v) => v.type === 'RELATIONSHIP_CONFLICT');
            (0, vitest_1.expect)(violation).toBeDefined();
        });
        (0, vitest_1.it)('should allow attribute updates with same value', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.violations.length).toBe(0);
            (0, vitest_1.expect)(report.result.alignmentScore).toBeGreaterThan(0.9);
        });
    });
    (0, vitest_1.describe)('Missing Entity Violations', () => {
        (0, vitest_1.it)('should detect reference to unknown entity', async () => {
            const expansion = {
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
            const violation = report.result.violations.find((v) => v.type === 'MISSING_ENTITY');
            (0, vitest_1.expect)(violation).toBeDefined();
            (0, vitest_1.expect)(violation?.severity).toBe('high');
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('review');
        });
    });
    (0, vitest_1.describe)('Missing Context', () => {
        (0, vitest_1.it)('should flag vague location claims', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.detailedAnalysis.contextFindings.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(report.result.missingContext.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Alignment Scoring', () => {
        (0, vitest_1.it)('should compute high alignment for fully consistent expansion', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.alignmentScore).toBeGreaterThan(0.95);
        });
        (0, vitest_1.it)('should reduce alignment for violations', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.alignmentScore).toBeLessThan(0.8);
        });
    });
    (0, vitest_1.describe)('Drift Vector', () => {
        (0, vitest_1.it)('should compute zero drift for first validation of expansion', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.driftVector).toBe(0);
        });
        (0, vitest_1.it)('should detect positive drift on re-validation', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(drift).toBe(0); // Same expansion, same result
        });
    });
    (0, vitest_1.describe)('Approval Recommendations', () => {
        (0, vitest_1.it)('should auto-approve fully consistent expansions', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('auto_approve');
        });
        (0, vitest_1.it)('should request review for marginal cases', async () => {
            const expansion = {
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
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('review');
        });
        (0, vitest_1.it)('should reject expansions with critical violations', async () => {
            const memory = {
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
            const expansion = {
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
            (0, vitest_1.expect)(report.result.approvalRecommendation).toBe('reject');
        });
    });
    (0, vitest_1.describe)('Statistics', () => {
        (0, vitest_1.it)('should track consistency statistics across validations', async () => {
            const exp1 = {
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
            const exp2 = {
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
            (0, vitest_1.expect)(stats.validationsRun).toBe(2);
            (0, vitest_1.expect)(stats.avgAlignment).toBeGreaterThan(0.9);
            (0, vitest_1.expect)(stats.violationRate).toBe(0);
        });
    });
});
//# sourceMappingURL=MemoryConsistencyValidator.test.js.map