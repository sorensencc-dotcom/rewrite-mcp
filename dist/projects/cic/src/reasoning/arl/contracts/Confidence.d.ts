export interface ArlConfidence {
    weightedScore: number;
    factors: {
        coherence: number;
        semantic: number;
        temporal: number;
        causal: number;
        narrative: number;
    };
}
//# sourceMappingURL=Confidence.d.ts.map