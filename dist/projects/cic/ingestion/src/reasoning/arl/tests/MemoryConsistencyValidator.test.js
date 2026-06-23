"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MemoryConsistencyValidator_1 = require("../engine/MemoryConsistencyValidator");
const MemoryFixtures_1 = require("./fixtures/MemoryFixtures");
const ExpansionFixtures_1 = require("./fixtures/ExpansionFixtures");
(0, vitest_1.describe)('Batch 2, Phase 7.15: Memory Consistency Validator', () => {
    let validator;
    (0, vitest_1.beforeEach)(() => {
        validator = new MemoryConsistencyValidator_1.MemoryConsistencyValidator();
    });
    (0, vitest_1.describe)('Temporal consistency', () => {
        (0, vitest_1.it)('should accept memory with consistent timeline', () => {
            const memory = (0, MemoryFixtures_1.makeConsistentMemorySnapshot)();
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            (0, vitest_1.expect)(result.alignmentScore).toBeGreaterThan(0.8);
            (0, vitest_1.expect)(result.violations.filter((v) => v.type === 'TEMPORAL')).toHaveLength(0);
        });
        (0, vitest_1.it)('should detect out-of-order events', () => {
            const memory = (0, MemoryFixtures_1.makeInconsistentMemorySnapshot)();
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            const temporalViolations = result.violations.filter((v) => v.type === 'TEMPORAL');
            (0, vitest_1.expect)(temporalViolations.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.alignmentScore).toBeLessThan(0.8);
        });
    });
    (0, vitest_1.describe)('Contradiction detection', () => {
        (0, vitest_1.it)('should detect active/inactive contradictions', () => {
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
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            const contradictions = result.violations.filter((v) => v.type === 'CONTRADICTION');
            (0, vitest_1.expect)(contradictions.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Alignment scoring', () => {
        (0, vitest_1.it)('should compute high alignment for perfect memory', () => {
            const memory = (0, MemoryFixtures_1.makeConsistentMemorySnapshot)();
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            (0, vitest_1.expect)(result.alignmentScore).toBeCloseTo(1.0, 1);
        });
        (0, vitest_1.it)('should compute low alignment for severely inconsistent memory', () => {
            const memory = (0, MemoryFixtures_1.makeInconsistentMemorySnapshot)();
            const expansion = (0, ExpansionFixtures_1.makeContradictoryExpansion)();
            const result = validator.validate(expansion, memory);
            (0, vitest_1.expect)(result.alignmentScore).toBeLessThan(0.5);
        });
        (0, vitest_1.it)('should handle empty memory gracefully', () => {
            const memory = (0, MemoryFixtures_1.makeEmptyMemorySnapshot)();
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            (0, vitest_1.expect)(result.alignmentScore).toBe(1.0);
            (0, vitest_1.expect)(result.violations).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('Missing entity detection', () => {
        (0, vitest_1.it)('should flag entities with no events', () => {
            const memory = (0, MemoryFixtures_1.makeMemorySnapshotWithMissingEntity)();
            const expansion = (0, ExpansionFixtures_1.makeStableExpansion)();
            const result = validator.validate(expansion, memory);
            const missingViolations = result.violations.filter((v) => v.type === 'MISSING');
            (0, vitest_1.expect)(missingViolations.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Drift vector computation', () => {
        (0, vitest_1.it)('should compute positive drift for degradation', () => {
            const previous = {
                alignmentScore: 0.9,
                driftVector: 0,
                violations: [],
            };
            const current = {
                alignmentScore: 0.7,
                driftVector: 0,
                violations: [
                    { entityId: 'e1', type: 'TEMPORAL', details: 'test' },
                ],
            };
            const drift = validator.computeDriftVector(previous, current);
            (0, vitest_1.expect)(drift).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should compute negative drift for improvement', () => {
            const previous = {
                alignmentScore: 0.5,
                driftVector: 0,
                violations: [
                    { entityId: 'e1', type: 'TEMPORAL', details: 'test' },
                    { entityId: 'e2', type: 'CONTRADICTION', details: 'test' },
                ],
            };
            const current = {
                alignmentScore: 0.85,
                driftVector: 0,
                violations: [],
            };
            const drift = validator.computeDriftVector(previous, current);
            (0, vitest_1.expect)(drift).toBeLessThan(0);
        });
        (0, vitest_1.it)('should compute zero drift for no change', () => {
            const result = {
                alignmentScore: 0.75,
                driftVector: 0,
                violations: [],
            };
            const drift = validator.computeDriftVector(result, result);
            (0, vitest_1.expect)(drift).toBe(0);
        });
    });
});
//# sourceMappingURL=MemoryConsistencyValidator.test.js.map