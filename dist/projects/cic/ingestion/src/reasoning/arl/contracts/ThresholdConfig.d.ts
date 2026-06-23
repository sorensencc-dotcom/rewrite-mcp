export interface ThresholdConfig {
    compositeReasoningMin: number;
    confidenceMin: number;
    driftMaxMagnitude: number;
    contradictionSeverityMax: number;
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
export declare const DEFAULT_THRESHOLDS: ThresholdConfig;
export declare const REJECT_CODES: {
    readonly COMPOSITE_TOO_LOW: "E001_composite_reasoning_below_threshold";
    readonly CONFIDENCE_TOO_LOW: "E002_confidence_below_threshold";
    readonly DRIFT_TOO_HIGH: "E003_drift_magnitude_exceeds_threshold";
    readonly CONTRADICTION_TOO_SEVERE: "E004_contradiction_severity_exceeds_threshold";
    readonly MULTIPLE_FAILURES: "E005_multiple_threshold_failures";
};
//# sourceMappingURL=ThresholdConfig.d.ts.map