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
  driftOfDriftScore: number; // 0–1: is drift itself drifting?
  weightingSanityScore: number; // 0–1: are weighting assignments sane?
  reasoningIntegrityScore: number; // 0–1: overall reasoning coherence
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
    severity: number; // 0–1
  }[];
}
