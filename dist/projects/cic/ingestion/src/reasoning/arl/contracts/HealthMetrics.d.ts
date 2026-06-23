export interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'failed';
    message: string;
    lastRun: Date;
}
export interface SelfDiagnosticsResult {
    timestamp: Date;
    overallStatus: 'healthy' | 'degraded' | 'failed';
    checks: HealthCheck[];
    driftOfDriftScore: number;
    weightingSanityScore: number;
    reasoningIntegrityScore: number;
    subsystemScores: {
        compositeReasoning: number;
        confidenceModel: number;
        driftCalculator: number;
        verdictSynthesizer: number;
    };
    recommendations: string[];
}
export interface ContradictionDetectorResult {
    hasSelfContradictions: boolean;
    contradictions: {
        subsystemA: string;
        subsystemB: string;
        nature: string;
        severity: number;
    }[];
}
//# sourceMappingURL=HealthMetrics.d.ts.map