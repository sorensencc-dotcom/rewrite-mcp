export interface MemoryViolation {
  entityId: string;
  type: 'TEMPORAL' | 'CONTRADICTION' | 'MISSING';
  details: string;
}

export interface MemoryConsistencyResult {
  alignmentScore: number; // 0–1, higher is better
  driftVector: number; // change in consistency over time
  violations: MemoryViolation[];
}
