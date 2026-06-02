/**
 * projects/cic/src/reasoning/arl/contracts/CausalReasoning.ts
 * Causal reasoning contract for Phase 7.4.
 * Evaluates whether a candidate expansion preserves causal relationships.
 */

export interface CausalReasoning {
  causalLinks: string[];         // extracted causal relationships
  missingPrerequisites: string[]; // required but absent
  violatedDependencies: string[]; // contradictions in causal chain
  causalStrength: number;         // 0–1
  conflictCount: number;          // integer
  overall: number;                // weighted composite
}
