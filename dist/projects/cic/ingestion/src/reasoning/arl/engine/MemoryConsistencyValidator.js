"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryConsistencyValidator = void 0;
class MemoryConsistencyValidator {
    validate(expansion, memory) {
        const violations = [];
        for (const entity of memory.entities) {
            const entityViolations = this.validateEntity(entity);
            violations.push(...entityViolations);
        }
        const alignmentScore = this.computeAlignmentScore(memory.entities.length, violations.length);
        return {
            alignmentScore,
            driftVector: 0,
            violations,
        };
    }
    computeDriftVector(previous, current) {
        const alignmentDelta = current.alignmentScore - previous.alignmentScore;
        const violationDelta = current.violations.length - previous.violations.length;
        if (alignmentDelta < 0) {
            return Math.abs(alignmentDelta) + violationDelta * 0.1;
        }
        else if (alignmentDelta > 0) {
            return -Math.abs(alignmentDelta) - violationDelta * 0.1;
        }
        else {
            return 0;
        }
    }
    validateEntity(entity) {
        const violations = [];
        if (entity.events.length === 0) {
            violations.push({
                entityId: entity.entityId,
                type: 'MISSING',
                details: 'Entity has no timeline events',
            });
            return violations;
        }
        const sortedEvents = [...entity.events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        for (let i = 0; i < entity.events.length; i++) {
            const actual = entity.events[i];
            const expected = sortedEvents[i];
            if (new Date(actual.timestamp).getTime() !==
                new Date(expected.timestamp).getTime()) {
                violations.push({
                    entityId: entity.entityId,
                    type: 'TEMPORAL',
                    details: `Event at index ${i} out of order`,
                });
                break;
            }
        }
        const contradictions = this.detectContradictions(entity);
        violations.push(...contradictions);
        return violations;
    }
    detectContradictions(entity) {
        const violations = [];
        const descriptions = entity.events.map((e) => e.description.toLowerCase());
        for (let i = 0; i < descriptions.length - 1; i++) {
            const current = descriptions[i];
            const next = descriptions[i + 1];
            if (this.isContradiction(current, next)) {
                violations.push({
                    entityId: entity.entityId,
                    type: 'CONTRADICTION',
                    details: `Contradiction between event ${i} and ${i + 1}`,
                });
            }
        }
        return violations;
    }
    isContradiction(desc1, desc2) {
        const negationPatterns = [
            { positive: 'active', negative: 'inactive' },
            { positive: 'present', negative: 'absent' },
            { positive: 'enabled', negative: 'disabled' },
        ];
        for (const pattern of negationPatterns) {
            if (desc1.includes(pattern.positive) &&
                desc2.includes(pattern.negative)) {
                return true;
            }
            if (desc1.includes(pattern.negative) &&
                desc2.includes(pattern.positive)) {
                return true;
            }
        }
        return false;
    }
    computeAlignmentScore(totalEntities, violationCount) {
        if (totalEntities === 0)
            return 1.0;
        const violationRatio = violationCount / (totalEntities * 2);
        return Math.max(0, Math.min(1, 1 - violationRatio));
    }
}
exports.MemoryConsistencyValidator = MemoryConsistencyValidator;
//# sourceMappingURL=MemoryConsistencyValidator.js.map