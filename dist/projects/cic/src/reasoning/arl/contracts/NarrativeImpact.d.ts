/**
 * projects/cic/src/reasoning/arl/contracts/NarrativeImpact.ts
 * Narrative impact contract for Phase 7.5.
 * Evaluates narrative consequences of candidate expansions.
 */
export interface NarrativeImpact {
    reinforcementScore: number;
    dilutionScore: number;
    contradictionScore: number;
    noveltyScore: number;
    riskScore: number;
    overall: number;
}
//# sourceMappingURL=NarrativeImpact.d.ts.map