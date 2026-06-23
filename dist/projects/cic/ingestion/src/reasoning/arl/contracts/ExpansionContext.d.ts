export interface ExpansionContext {
    id: string;
    timestamp: string;
    content: string;
    semanticSignals: {
        similarity: number;
        novelty: number;
    };
    temporalSignals: {
        recency: number;
        sequenceDrift: number;
    };
    narrativeSignals: {
        coherence: number;
        contradiction: number;
    };
    causalSignals: {
        depthScore: number;
        loopDetection: number;
    };
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=ExpansionContext.d.ts.map