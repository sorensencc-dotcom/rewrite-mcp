/**
 * projects/cic/src/reasoning/arl/contracts/CausalReasoning.ts
 * Causal reasoning contract for Phase 7.4.
 * Evaluates whether a candidate expansion preserves causal relationships.
 */
export interface CausalReasoning {
    causalLinks: string[];
    missingPrerequisites: string[];
    violatedDependencies: string[];
    causalStrength: number;
    conflictCount: number;
    overall: number;
}
//# sourceMappingURL=CausalReasoning.d.ts.map