import { EvidenceScore } from './EvidenceScorer';
export interface Contradiction {
    description: string;
    severity: number;
}
export interface ContradictionAnalysis {
    contradictions: Contradiction[];
    hasCritical: boolean;
}
export declare function detectContradictions(scores: EvidenceScore[]): ContradictionAnalysis;
//# sourceMappingURL=ContradictionDetector.d.ts.map