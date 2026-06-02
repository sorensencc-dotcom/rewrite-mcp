/**
 * projects/cic/src/reasoning/arl/contracts/NarrativeImpact.ts
 * Narrative impact contract for Phase 7.5.
 * Evaluates narrative consequences of candidate expansions.
 */

export interface NarrativeImpact {
  reinforcementScore: number;   // 0–1: does this strengthen the narrative spine?
  dilutionScore: number;        // 0–1: does this dilute core narrative?
  contradictionScore: number;   // 0–1: does this contradict the narrative?
  noveltyScore: number;         // 0–1: is this a meaningful narrative addition?
  riskScore: number;            // 0–1: narrative risk signal
  overall: number;              // weighted composite
}
