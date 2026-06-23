import { Verdict } from './engine/VerdictSynthesizer';
import { CoherenceScore, SemanticAlignment, TemporalConsistency, CausalReasoning, NarrativeImpact, CompositeReasoning, ArlConfidence, DriftImpact } from './contracts/index';
export interface ArlInput {
    coherence: CoherenceScore;
    semantic: SemanticAlignment;
    temporal: TemporalConsistency;
    causal: CausalReasoning;
    narrative: NarrativeImpact;
    composite: CompositeReasoning;
    confidence: ArlConfidence;
    drift: DriftImpact;
}
export declare function runArl(input: ArlInput): Promise<Verdict>;
export { VerdictSynthesizer, Verdict } from './engine/VerdictSynthesizer';
export { formatReasoningTrace, FormattedTraceStep } from './engine/ReasoningTraceFormatter';
export * from './contracts/index';
//# sourceMappingURL=index.d.ts.map