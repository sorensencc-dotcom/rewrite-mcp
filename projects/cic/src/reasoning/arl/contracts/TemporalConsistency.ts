/**
 * projects/cic/src/reasoning/arl/contracts/TemporalConsistency.ts
 * Temporal consistency contract for Phase 7.3.
 * Measures whether a candidate expansion maintains timeline coherence.
 */

export interface TemporalConsistency {
  orderingScore: number;        // 0–1: temporal ordering alignment
  causalityScore: number;       // 0–1: causality preservation
  conflictCount: number;        // integer: retroactive conflicts detected
  driftTemporalImpact: number;  // -1 to +1: temporal drift direction
  overall: number;              // weighted composite
}
