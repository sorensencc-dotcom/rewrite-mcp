/**
 * projects/cic/src/reasoning/arl/contracts/SemanticAlignment.ts
 * Semantic alignment contract for Phase 7.2.
 * Measures whether a candidate expansion aligns with CIC's semantic universe.
 */

export interface SemanticAlignment {
  recognizedEntities: string[];
  unrecognizedEntities: string[];
  relationshipMatches: number;   // 0–1
  entityCoverage: number;        // 0–1
  overall: number;               // weighted composite
}
