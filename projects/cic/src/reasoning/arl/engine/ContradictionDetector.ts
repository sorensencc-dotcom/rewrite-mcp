import { EvidenceScore } from './EvidenceScorer';

export interface Contradiction {
  description: string;
  severity: number;
}

export interface ContradictionAnalysis {
  contradictions: Contradiction[];
  hasCritical: boolean;
}

export function detectContradictions(
  scores: EvidenceScore[]
): ContradictionAnalysis {
  return {
    contradictions: [],
    hasCritical: false
  };
}
