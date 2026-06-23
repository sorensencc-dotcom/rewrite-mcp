import { ExpansionContext } from '../contracts/ExpansionContext';
import { MemorySnapshot } from '../contracts/MemorySnapshot';
import { MemoryConsistencyResult } from '../contracts/MemoryConsistencyResult';
export declare class MemoryConsistencyValidator {
    validate(expansion: ExpansionContext, memory: MemorySnapshot): MemoryConsistencyResult;
    computeDriftVector(previous: MemoryConsistencyResult, current: MemoryConsistencyResult): number;
    private validateEntity;
    private detectContradictions;
    private isContradiction;
    private computeAlignmentScore;
}
//# sourceMappingURL=MemoryConsistencyValidator.d.ts.map