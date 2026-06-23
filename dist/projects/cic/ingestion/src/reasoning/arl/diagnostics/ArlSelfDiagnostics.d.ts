import { ArlWeights } from '../contracts/Weights';
import { ThresholdConfig } from '../contracts/ThresholdConfig';
export interface SubsystemHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    lastCheck: Date;
    issues?: string[];
}
export interface DriftAnalysis {
    currentDrift: number;
    driftOfDrift: number;
    driftTrend: 'stable' | 'increasing' | 'decreasing';
    seasonality: boolean;
    anomalies: Array<{
        timestamp: Date;
        magnitude: number;
    }>;
}
export interface WeightingValidation {
    status: 'valid' | 'drifted' | 'invalid';
    expectedWeights: ArlWeights;
    actualWeights: ArlWeights;
    deviations: Record<string, number>;
    maxDeviation: number;
    threshold: number;
}
export interface ReasoningIntegrityScore {
    overall: number;
    subsystemHealth: number;
    driftStability: number;
    weightingConsistency: number;
    contradictionDetection: number;
    timestamp: Date;
    issues: string[];
    recommendations: string[];
}
export interface DiagnosticReport {
    timestamp: Date;
    phaseId: '7.14';
    reasoningIntegrity: ReasoningIntegrityScore;
    subsystemHealthChecks: SubsystemHealth[];
    driftAnalysis: DriftAnalysis;
    weightingValidation: WeightingValidation;
    thresholdCalibration: ThresholdCalibrationReport;
    summary: string;
}
export interface ThresholdCalibrationReport {
    compositeReasoningMin: ThresholdQuality;
    confidenceMin: ThresholdQuality;
    driftMaxMagnitude: ThresholdQuality;
    contradictionSeverityMax: ThresholdQuality;
}
export interface ThresholdQuality {
    threshold: number;
    appropriateness: 'too_low' | 'optimal' | 'too_high';
    evidence: string;
    overrideRate: number;
    falsePositiveRate: number;
}
/**
 * Phase 7.14 — ARL Self-Diagnostics
 * Monitors ARL health, drift stability, weighting consistency, and threshold calibration
 */
export declare class ArlSelfDiagnostics {
    private subsystemScores;
    private driftHistory;
    private thresholdChecks;
    private expectedWeights;
    private config;
    constructor(expectedWeights?: ArlWeights, config?: ThresholdConfig);
    /**
     * Initialize subsystem tracking
     */
    private initializeSubsystems;
    /**
     * Record a subsystem score for health monitoring
     */
    recordSubsystemScore(subsystem: string, score: number): void;
    /**
     * Record drift magnitude for meta-drift analysis
     */
    recordDrift(magnitude: number): void;
    /**
     * Record threshold decision outcomes for calibration analysis
     */
    recordThresholdDecision(rejectCode: string, wasEscalated: boolean, wasOverridden: boolean): void;
    /**
     * Run comprehensive diagnostic
     */
    runDiagnostics(): DiagnosticReport;
    /**
     * Check health of each ARL subsystem
     */
    private checkSubsystemHealth;
    /**
     * Analyze drift and meta-drift (drift of drift)
     */
    private analyzeDrift;
    /**
     * Validate that weights haven't drifted from expected values
     */
    private validateWeighting;
    /**
     * Analyze threshold calibration (are thresholds appropriate?)
     */
    private calibrateThresholds;
    /**
     * Analyze if a single threshold is well-calibrated
     */
    private analyzeThresholdQuality;
    /**
     * Compute overall reasoning integrity score
     */
    private computeReasoningIntegrity;
    /**
     * Generate human-readable diagnostic summary
     */
    private generateSummary;
}
//# sourceMappingURL=ArlSelfDiagnostics.d.ts.map