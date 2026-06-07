import { ArlWeights } from '../contracts/Weights';
import { ThresholdConfig, DEFAULT_THRESHOLDS } from '../contracts/ThresholdConfig';

export interface SubsystemHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  score: number; // 0-1
  lastCheck: Date;
  issues?: string[];
}

export interface DriftAnalysis {
  currentDrift: number;
  driftOfDrift: number; // Is drift itself changing?
  driftTrend: 'stable' | 'increasing' | 'decreasing';
  seasonality: boolean; // Seasonal pattern in drift?
  anomalies: Array<{ timestamp: Date; magnitude: number }>;
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
  overall: number; // 0-1
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
  overrideRate: number; // % of operator overrides
  falsePositiveRate: number; // % of escalations that shouldn't have
}

/**
 * Phase 7.14 — ARL Self-Diagnostics
 * Monitors ARL health, drift stability, weighting consistency, and threshold calibration
 */
export class ArlSelfDiagnostics {
  private subsystemScores: Map<string, number[]> = new Map();
  private driftHistory: Array<{ timestamp: Date; magnitude: number }> = [];
  private thresholdChecks: Map<string, { escalated: number; overridden: number }> =
    new Map();
  private expectedWeights: ArlWeights;
  private config: ThresholdConfig;

  constructor(
    expectedWeights: ArlWeights = {
      coherence: 0.20,
      semantic: 0.25,
      temporal: 0.20,
      causal: 0.15,
      narrative: 0.20,
    },
    config: ThresholdConfig = DEFAULT_THRESHOLDS
  ) {
    this.expectedWeights = expectedWeights;
    this.config = config;
    this.initializeSubsystems();
  }

  /**
   * Initialize subsystem tracking
   */
  private initializeSubsystems(): void {
    const subsystems = ['coherence', 'semantic', 'temporal', 'causal', 'narrative'];
    for (const subsystem of subsystems) {
      this.subsystemScores.set(subsystem, []);
      this.thresholdChecks.set(subsystem, { escalated: 0, overridden: 0 });
    }
  }

  /**
   * Record a subsystem score for health monitoring
   */
  recordSubsystemScore(subsystem: string, score: number): void {
    const scores = this.subsystemScores.get(subsystem);
    if (scores) {
      scores.push(score);
      // Keep last 1000 scores for rolling average
      if (scores.length > 1000) {
        scores.shift();
      }
    }
  }

  /**
   * Record drift magnitude for meta-drift analysis
   */
  recordDrift(magnitude: number): void {
    this.driftHistory.push({
      timestamp: new Date(),
      magnitude,
    });
    // Keep last 500 measurements
    if (this.driftHistory.length > 500) {
      this.driftHistory.shift();
    }
  }

  /**
   * Record threshold decision outcomes for calibration analysis
   */
  recordThresholdDecision(
    rejectCode: string,
    wasEscalated: boolean,
    wasOverridden: boolean
  ): void {
    const key =
      rejectCode || 'E000_accept'; // Group by reject code or accept
    if (!this.thresholdChecks.has(key)) {
      this.thresholdChecks.set(key, { escalated: 0, overridden: 0 });
    }

    const stats = this.thresholdChecks.get(key)!;
    if (wasEscalated) stats.escalated++;
    if (wasOverridden) stats.overridden++;
  }

  /**
   * Run comprehensive diagnostic
   */
  runDiagnostics(): DiagnosticReport {
    const subsystemHealthChecks = this.checkSubsystemHealth();
    const driftAnalysis = this.analyzeDrift();
    const weightingValidation = this.validateWeighting();
    const thresholdCalibration = this.calibrateThresholds();
    const reasoningIntegrity = this.computeReasoningIntegrity(
      subsystemHealthChecks,
      driftAnalysis,
      weightingValidation,
      thresholdCalibration
    );

    return {
      timestamp: new Date(),
      phaseId: '7.14',
      reasoningIntegrity,
      subsystemHealthChecks,
      driftAnalysis,
      weightingValidation,
      thresholdCalibration,
      summary: this.generateSummary(reasoningIntegrity),
    };
  }

  /**
   * Check health of each ARL subsystem
   */
  private checkSubsystemHealth(): SubsystemHealth[] {
    const checks: SubsystemHealth[] = [];

    for (const [subsystem, scores] of this.subsystemScores) {
      const issues: string[] = [];

      if (scores.length === 0) {
        checks.push({
          name: subsystem,
          status: 'critical',
          score: 0,
          lastCheck: new Date(),
          issues: ['No scores recorded'],
        });
        continue;
      }

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance =
        scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      // Health checks
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      let score = 1.0;

      // Low mean score
      if (mean < 0.65) {
        issues.push(`Low average score: ${mean.toFixed(3)}`);
        status = 'degraded';
        score -= 0.3;
      }

      // High variance (inconsistent)
      if (stdDev > 0.25) {
        issues.push(`High variance: ${stdDev.toFixed(3)} (inconsistent)`);
        status = 'degraded';
        score -= 0.2;
      }

      // Deteriorating trend
      const recent = scores.slice(-100);
      const older = scores.slice(-200, -100);
      if (recent.length > 0 && older.length > 0) {
        const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
        if (recentMean < olderMean - 0.05) {
          issues.push(
            `Deteriorating trend: ${olderMean.toFixed(3)} → ${recentMean.toFixed(3)}`
          );
          status = 'degraded';
          score -= 0.15;
        }
      }

      if (status === 'degraded' && score < 0.5) {
        status = 'critical';
      }

      checks.push({
        name: subsystem,
        status,
        score: Math.max(0, score),
        lastCheck: new Date(),
        issues: issues.length > 0 ? issues : undefined,
      });
    }

    return checks;
  }

  /**
   * Analyze drift and meta-drift (drift of drift)
   */
  private analyzeDrift(): DriftAnalysis {
    if (this.driftHistory.length < 10) {
      return {
        currentDrift: 0,
        driftOfDrift: 0,
        driftTrend: 'stable',
        seasonality: false,
        anomalies: [],
      };
    }

    // Current drift
    const recent = this.driftHistory.slice(-20);
    const currentDrift = recent.reduce((a, b) => a + b.magnitude, 0) / recent.length;

    // Drift of drift (is drift itself changing?)
    const driftMagnitudes = this.driftHistory.map((d) => d.magnitude);
    const driftMean = driftMagnitudes.reduce((a, b) => a + b, 0) / driftMagnitudes.length;
    const driftVariance =
      driftMagnitudes.reduce((sum, d) => sum + Math.pow(d - driftMean, 2), 0) /
      driftMagnitudes.length;
    const driftOfDrift = Math.sqrt(driftVariance);

    // Trend detection
    const firstHalf = driftMagnitudes.slice(0, Math.floor(driftMagnitudes.length / 2));
    const secondHalf = driftMagnitudes.slice(Math.floor(driftMagnitudes.length / 2));
    const firstHalfMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let driftTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (secondHalfMean > firstHalfMean + 0.05) {
      driftTrend = 'increasing';
    } else if (secondHalfMean < firstHalfMean - 0.05) {
      driftTrend = 'decreasing';
    }

    // Anomaly detection (values > 2 std devs from mean)
    const stdDev = Math.sqrt(driftVariance);
    const anomalies = this.driftHistory.filter(
      (d) => Math.abs(d.magnitude - driftMean) > 2 * stdDev
    );

    // Seasonality check (if we have 100+ samples, check for periodic patterns)
    let seasonality = false;
    if (driftMagnitudes.length >= 100) {
      // Simple check: compare values at 24-interval
      const interval = 24;
      let correlation = 0;
      for (let i = interval; i < driftMagnitudes.length; i++) {
        correlation += driftMagnitudes[i] * driftMagnitudes[i - interval];
      }
      correlation /= driftMagnitudes.length - interval;
      seasonality = correlation > 0.6; // High correlation suggests seasonality
    }

    return {
      currentDrift,
      driftOfDrift,
      driftTrend,
      seasonality,
      anomalies,
    };
  }

  /**
   * Validate that weights haven't drifted from expected values
   */
  private validateWeighting(): WeightingValidation {
    // In production, actual weights would come from the weighting model
    // For now, we assume weights are stable unless explicitly changed
    const actualWeights = { ...this.expectedWeights };

    const deviations: Record<string, number> = {};
    let maxDeviation = 0;

    for (const [key, expected] of Object.entries(this.expectedWeights)) {
      const actual = actualWeights[key as keyof ArlWeights];
      const deviation = Math.abs(actual - expected);
      deviations[key] = deviation;
      maxDeviation = Math.max(maxDeviation, deviation);
    }

    let status: 'valid' | 'drifted' | 'invalid' = 'valid';
    if (maxDeviation > 0.05) {
      status = 'drifted';
    }
    if (maxDeviation > 0.1) {
      status = 'invalid';
    }

    return {
      status,
      expectedWeights: this.expectedWeights,
      actualWeights,
      deviations,
      maxDeviation,
      threshold: 0.05,
    };
  }

  /**
   * Analyze threshold calibration (are thresholds appropriate?)
   */
  private calibrateThresholds(): ThresholdCalibrationReport {
    return {
      compositeReasoningMin: this.analyzeThresholdQuality(
        'composite_reasoning',
        this.config.compositeReasoningMin
      ),
      confidenceMin: this.analyzeThresholdQuality(
        'confidence',
        this.config.confidenceMin
      ),
      driftMaxMagnitude: this.analyzeThresholdQuality(
        'drift',
        this.config.driftMaxMagnitude
      ),
      contradictionSeverityMax: this.analyzeThresholdQuality(
        'contradiction',
        this.config.contradictionSeverityMax
      ),
    };
  }

  /**
   * Analyze if a single threshold is well-calibrated
   */
  private analyzeThresholdQuality(
    name: string,
    threshold: number
  ): ThresholdQuality {
    const stats = this.thresholdChecks.get(name) || { escalated: 0, overridden: 0 };
    const total = stats.escalated + stats.overridden;
    const overrideRate = total > 0 ? stats.overridden / total : 0;

    let appropriateness: 'too_low' | 'optimal' | 'too_high';
    if (overrideRate > 0.5) {
      // Too many overrides = threshold too strict
      appropriateness = 'too_low';
    } else if (overrideRate < 0.1) {
      // Too few overrides = threshold might be too lenient
      appropriateness = 'too_high';
    } else {
      appropriateness = 'optimal';
    }

    return {
      threshold,
      appropriateness,
      evidence: `Override rate: ${(overrideRate * 100).toFixed(1)}%`,
      overrideRate,
      falsePositiveRate: overrideRate, // Approximation
    };
  }

  /**
   * Compute overall reasoning integrity score
   */
  private computeReasoningIntegrity(
    subsystemHealth: SubsystemHealth[],
    driftAnalysis: DriftAnalysis,
    weighting: WeightingValidation,
    calibration: ThresholdCalibrationReport
  ): ReasoningIntegrityScore {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Subsystem health score
    const subsystemHealthScore =
      subsystemHealth.length > 0
        ? subsystemHealth.reduce((sum, s) => sum + s.score, 0) / subsystemHealth.length
        : 0.5;

    if (subsystemHealthScore < 0.7) {
      issues.push('One or more subsystems showing degraded health');
      recommendations.push('Review subsystem scores and trends for drift');
    }

    // Drift stability score
    let driftStabilityScore = 1.0;
    if (driftAnalysis.driftTrend === 'increasing') {
      driftStabilityScore -= 0.2;
      issues.push('Drift magnitude is increasing');
      recommendations.push('Investigate source of increasing drift');
    }
    if (driftAnalysis.anomalies.length > driftAnalysis.anomalies.length * 0.1) {
      driftStabilityScore -= 0.1;
      issues.push(`${driftAnalysis.anomalies.length} drift anomalies detected`);
    }
    if (driftAnalysis.seasonality) {
      recommendations.push(
        'Seasonal pattern detected in drift; adjust expectations or add seasonal handling'
      );
    }

    // Weighting consistency score
    let weightingConsistencyScore = 1.0;
    if (weighting.status === 'drifted') {
      weightingConsistencyScore -= 0.3;
      issues.push('Weights have drifted from expected values');
      recommendations.push('Re-calibrate weighting model');
    }
    if (weighting.status === 'invalid') {
      weightingConsistencyScore = 0.3;
      issues.push('Weight validation FAILED — critical issue');
      recommendations.push('Immediately re-validate and recalibrate weights');
    }

    // Contradiction detection score (based on threshold calibration)
    let contradictionDetectionScore = 1.0;
    const calibrations = [
      calibration.compositeReasoningMin,
      calibration.confidenceMin,
      calibration.driftMaxMagnitude,
      calibration.contradictionSeverityMax,
    ];
    for (const cal of calibrations) {
      if (cal.appropriateness === 'too_low') {
        contradictionDetectionScore -= 0.15;
        issues.push(`${cal.threshold} threshold too strict`);
        recommendations.push('Consider relaxing this threshold');
      } else if (cal.appropriateness === 'too_high') {
        contradictionDetectionScore -= 0.1;
        recommendations.push('Consider tightening this threshold');
      }
    }

    const overall =
      subsystemHealthScore * 0.3 +
      driftStabilityScore * 0.25 +
      weightingConsistencyScore * 0.25 +
      contradictionDetectionScore * 0.2;

    return {
      overall: Math.max(0, Math.min(1, overall)),
      subsystemHealth: subsystemHealthScore,
      driftStability: driftStabilityScore,
      weightingConsistency: weightingConsistencyScore,
      contradictionDetection: contradictionDetectionScore,
      timestamp: new Date(),
      issues,
      recommendations,
    };
  }

  /**
   * Generate human-readable diagnostic summary
   */
  private generateSummary(integrity: ReasoningIntegrityScore): string {
    const percent = (integrity.overall * 100).toFixed(1);
    if (integrity.overall >= 0.9) {
      return `✅ ARL Reasoning Integrity: EXCELLENT (${percent}%) — All systems nominal`;
    } else if (integrity.overall >= 0.75) {
      return `⚠️ ARL Reasoning Integrity: GOOD (${percent}%) — Minor issues detected, no immediate action needed`;
    } else if (integrity.overall >= 0.6) {
      return `⚠️ ARL Reasoning Integrity: FAIR (${percent}%) — Notable issues detected, review recommended`;
    } else {
      return `❌ ARL Reasoning Integrity: POOR (${percent}%) — Critical issues, immediate review required`;
    }
  }
}
