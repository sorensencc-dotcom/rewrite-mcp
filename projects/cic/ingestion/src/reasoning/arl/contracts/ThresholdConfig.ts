export interface ThresholdConfig {
  compositeReasoningMin: number; // 0–1
  confidenceMin: number; // 0–1
  driftMaxMagnitude: number; // normalized drift magnitude
  contradictionSeverityMax: number; // 0–1
}

export interface ThresholdResult {
  decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE';
  passed: ThresholdCheck[];
  failed: ThresholdCheck[];
  rejectCode?: string;
}

export interface ThresholdCheck {
  name: string;
  threshold: number;
  actual: number;
  pass: boolean;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  compositeReasoningMin: 0.75,
  confidenceMin: 0.7,
  driftMaxMagnitude: 0.3,
  contradictionSeverityMax: 0.2,
};

export const REJECT_CODES = {
  COMPOSITE_TOO_LOW: 'E001_composite_reasoning_below_threshold',
  CONFIDENCE_TOO_LOW: 'E002_confidence_below_threshold',
  DRIFT_TOO_HIGH: 'E003_drift_magnitude_exceeds_threshold',
  CONTRADICTION_TOO_SEVERE: 'E004_contradiction_severity_exceeds_threshold',
  MULTIPLE_FAILURES: 'E005_multiple_threshold_failures',
} as const;
