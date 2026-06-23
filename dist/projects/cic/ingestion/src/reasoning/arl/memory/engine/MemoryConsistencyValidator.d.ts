import { MemorySnapshot, ExpansionContext, IMemoryStore } from '../contracts/MemorySnapshot';
import { MemoryValidationReport } from '../contracts/MemoryConsistencyResult';
/**
 * Phase 7.15 — Memory Consistency Engine
 * Validates that expansions don't violate historical memory coherence
 */
export declare class MemoryConsistencyValidator {
    private memoryStore;
    private previousResults;
    constructor(memoryStore?: IMemoryStore);
    /**
     * Validate expansion against memory
     */
    validate(expansion: ExpansionContext, memory: MemorySnapshot): Promise<MemoryValidationReport>;
    /**
     * Check temporal consistency: events must be properly ordered
     */
    private checkTemporalConsistency;
    /**
     * Check for contradictions between new claims and existing attributes/events
     */
    private checkContradictions;
    /**
     * Check if sufficient context exists to validate claim
     */
    private checkMissingContext;
    /**
     * Determine if two values are contradictory
     */
    private isContradictory;
    /**
     * Get cumulative memory consistency across multiple validations
     */
    getConsistencyStats(): {
        validationsRun: number;
        avgAlignment: number;
        maxDrift: number;
        violationRate: number;
    };
}
//# sourceMappingURL=MemoryConsistencyValidator.d.ts.map