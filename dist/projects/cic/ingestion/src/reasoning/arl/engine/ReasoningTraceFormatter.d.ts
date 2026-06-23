import { CoherenceScore, SemanticAlignment, TemporalConsistency, CausalReasoning, NarrativeImpact, CompositeReasoning, ArlConfidence, DriftImpact } from '../contracts/index';
export interface FormattedTraceStep {
    subsystem: string;
    summary: string;
    score: number;
}
export declare function formatReasoningTrace(coherence: CoherenceScore, semantic: SemanticAlignment, temporal: TemporalConsistency, causal: CausalReasoning, narrative: NarrativeImpact, composite: CompositeReasoning, confidence: ArlConfidence, drift: DriftImpact): FormattedTraceStep[];
//# sourceMappingURL=ReasoningTraceFormatter.d.ts.map