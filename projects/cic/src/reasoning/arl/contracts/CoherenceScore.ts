/**
 * projects/cic/src/reasoning/arl/contracts/CoherenceScore.ts
 * Measures coherence across three orthogonal dimensions.
 */

export interface CoherenceScore {
  narrative: number;   // 0–1: alignment with narrative spine
  semantic: number;    // 0–1: semantic consistency with knowledge graph
  temporal: number;    // 0–1: timeline consistency with recent state
  overall: number;     // 0–1: weighted composite score
}
