export interface MemoryViolation {
    entityId: string;
    type: 'TEMPORAL' | 'CONTRADICTION' | 'MISSING';
    details: string;
}
export interface MemoryConsistencyResult {
    alignmentScore: number;
    driftVector: number;
    violations: MemoryViolation[];
}
//# sourceMappingURL=MemoryConsistencyResult.d.ts.map