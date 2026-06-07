import {
  ThresholdConfig,
  ThresholdResult,
  ThresholdCheck,
  DEFAULT_THRESHOLDS,
  REJECT_CODES,
} from '../contracts/ThresholdConfig';

export class ThresholdModel {
  private config: ThresholdConfig;

  constructor(config: Partial<ThresholdConfig> = {}) {
    this.config = { ...DEFAULT_THRESHOLDS, ...config };
  }

  evaluate(input: {
    compositeReasoning: number;
    confidence: number;
    driftMagnitude: number;
    contradictionSeverity: number;
  }): ThresholdResult {
    const passed: ThresholdCheck[] = [];
    const failed: ThresholdCheck[] = [];

    // Check composite reasoning
    const compositeCheck: ThresholdCheck = {
      name: 'Composite Reasoning',
      threshold: this.config.compositeReasoningMin,
      actual: input.compositeReasoning,
      pass: input.compositeReasoning >= this.config.compositeReasoningMin,
    };
    (compositeCheck.pass ? passed : failed).push(compositeCheck);

    // Check confidence
    const confidenceCheck: ThresholdCheck = {
      name: 'Confidence Level',
      threshold: this.config.confidenceMin,
      actual: input.confidence,
      pass: input.confidence >= this.config.confidenceMin,
    };
    (confidenceCheck.pass ? passed : failed).push(confidenceCheck);

    // Check drift magnitude
    const driftCheck: ThresholdCheck = {
      name: 'Drift Magnitude',
      threshold: this.config.driftMaxMagnitude,
      actual: input.driftMagnitude,
      pass: input.driftMagnitude <= this.config.driftMaxMagnitude,
    };
    (driftCheck.pass ? passed : failed).push(driftCheck);

    // Check contradiction severity
    const contradictionCheck: ThresholdCheck = {
      name: 'Contradiction Severity',
      threshold: this.config.contradictionSeverityMax,
      actual: input.contradictionSeverity,
      pass: input.contradictionSeverity <= this.config.contradictionSeverityMax,
    };
    (contradictionCheck.pass ? passed : failed).push(contradictionCheck);

    // Determine decision
    let decision: 'ACCEPT' | 'REJECT' | 'QUARANTINE';
    let rejectCode: string | undefined;

    if (failed.length === 0) {
      decision = 'ACCEPT';
    } else if (failed.length === 1) {
      decision = 'QUARANTINE';
      rejectCode = this.mapFailureToCode(failed[0].name);
    } else {
      decision = 'REJECT';
      rejectCode = REJECT_CODES.MULTIPLE_FAILURES;
    }

    return {
      decision,
      passed,
      failed,
      rejectCode,
    };
  }

  private mapFailureToCode(failureReason: string): string {
    const codeMap: Record<string, string> = {
      'Composite Reasoning': REJECT_CODES.COMPOSITE_TOO_LOW,
      'Confidence Level': REJECT_CODES.CONFIDENCE_TOO_LOW,
      'Drift Magnitude': REJECT_CODES.DRIFT_TOO_HIGH,
      'Contradiction Severity': REJECT_CODES.CONTRADICTION_TOO_SEVERE,
    };
    return codeMap[failureReason] || 'E000_unknown_failure';
  }
}
