/**
 * projects/cic/src/reasoning/arl/contracts/TemporalConsistency.ts
 * Temporal consistency contract for Phase 7.3.
 * Measures whether a candidate expansion maintains timeline coherence.
 */
export interface TemporalConsistency {
    orderingScore: number;
    causalityScore: number;
    conflictCount: number;
    driftTemporalImpact: number;
    overall: number;
}
