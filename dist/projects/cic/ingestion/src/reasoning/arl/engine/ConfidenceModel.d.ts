import { ArlConfidence, CompositeReasoning } from '../contracts/index';
export interface ConfidenceScore {
    score: number;
    weightedScore: number;
    reasoning: string;
    threshold: number;
}
export declare function calculateConfidence(composite: CompositeReasoning & {
    coherence: number;
    semantic: number;
    temporal: number;
    causal: number;
    narrative: number;
    overall: number;
}): ArlConfidence & ConfidenceScore;
//# sourceMappingURL=ConfidenceModel.d.ts.map