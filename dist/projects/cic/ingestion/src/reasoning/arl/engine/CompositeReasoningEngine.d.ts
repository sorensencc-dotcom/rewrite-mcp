import { CoherenceScore, SemanticAlignment, TemporalConsistency, CausalReasoning, NarrativeImpact, CompositeReasoning } from '../contracts/index';
export interface CompositeScores {
    coherence: number;
    semantic: number;
    temporal: number;
    causal: number;
    narrative: number;
    overall: number;
}
export declare function calculateCompositeReasoning(coherence: CoherenceScore, semantic: SemanticAlignment, temporal: TemporalConsistency, causal: CausalReasoning, narrative: NarrativeImpact): CompositeReasoning & CompositeScores;
//# sourceMappingURL=CompositeReasoningEngine.d.ts.map