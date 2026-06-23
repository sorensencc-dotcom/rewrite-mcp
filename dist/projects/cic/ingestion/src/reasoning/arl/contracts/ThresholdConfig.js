"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REJECT_CODES = exports.DEFAULT_THRESHOLDS = void 0;
exports.DEFAULT_THRESHOLDS = {
    compositeReasoningMin: 0.75,
    confidenceMin: 0.7,
    driftMaxMagnitude: 0.3,
    contradictionSeverityMax: 0.2,
};
exports.REJECT_CODES = {
    COMPOSITE_TOO_LOW: 'E001_composite_reasoning_below_threshold',
    CONFIDENCE_TOO_LOW: 'E002_confidence_below_threshold',
    DRIFT_TOO_HIGH: 'E003_drift_magnitude_exceeds_threshold',
    CONTRADICTION_TOO_SEVERE: 'E004_contradiction_severity_exceeds_threshold',
    MULTIPLE_FAILURES: 'E005_multiple_threshold_failures',
};
//# sourceMappingURL=ThresholdConfig.js.map