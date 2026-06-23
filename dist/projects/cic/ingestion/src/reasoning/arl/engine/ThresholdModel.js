"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThresholdModel = void 0;
const ThresholdConfig_1 = require("../contracts/ThresholdConfig");
class ThresholdModel {
    constructor(config = {}) {
        this.config = { ...ThresholdConfig_1.DEFAULT_THRESHOLDS, ...config };
    }
    evaluate(input) {
        const passed = [];
        const failed = [];
        // Check composite reasoning
        const compositeCheck = {
            name: 'Composite Reasoning',
            threshold: this.config.compositeReasoningMin,
            actual: input.compositeReasoning,
            pass: input.compositeReasoning >= this.config.compositeReasoningMin,
        };
        (compositeCheck.pass ? passed : failed).push(compositeCheck);
        // Check confidence
        const confidenceCheck = {
            name: 'Confidence Level',
            threshold: this.config.confidenceMin,
            actual: input.confidence,
            pass: input.confidence >= this.config.confidenceMin,
        };
        (confidenceCheck.pass ? passed : failed).push(confidenceCheck);
        // Check drift magnitude
        const driftCheck = {
            name: 'Drift Magnitude',
            threshold: this.config.driftMaxMagnitude,
            actual: input.driftMagnitude,
            pass: input.driftMagnitude <= this.config.driftMaxMagnitude,
        };
        (driftCheck.pass ? passed : failed).push(driftCheck);
        // Check contradiction severity
        const contradictionCheck = {
            name: 'Contradiction Severity',
            threshold: this.config.contradictionSeverityMax,
            actual: input.contradictionSeverity,
            pass: input.contradictionSeverity <= this.config.contradictionSeverityMax,
        };
        (contradictionCheck.pass ? passed : failed).push(contradictionCheck);
        // Determine decision
        let decision;
        let rejectCode;
        if (failed.length === 0) {
            decision = 'ACCEPT';
        }
        else if (failed.length === 1) {
            decision = 'QUARANTINE';
            rejectCode = this.mapFailureToCode(failed[0].name);
        }
        else {
            decision = 'REJECT';
            rejectCode = ThresholdConfig_1.REJECT_CODES.MULTIPLE_FAILURES;
        }
        return {
            decision,
            passed,
            failed,
            rejectCode,
        };
    }
    mapFailureToCode(failureReason) {
        const codeMap = {
            'Composite Reasoning': ThresholdConfig_1.REJECT_CODES.COMPOSITE_TOO_LOW,
            'Confidence Level': ThresholdConfig_1.REJECT_CODES.CONFIDENCE_TOO_LOW,
            'Drift Magnitude': ThresholdConfig_1.REJECT_CODES.DRIFT_TOO_HIGH,
            'Contradiction Severity': ThresholdConfig_1.REJECT_CODES.CONTRADICTION_TOO_SEVERE,
        };
        return codeMap[failureReason] || 'E000_unknown_failure';
    }
}
exports.ThresholdModel = ThresholdModel;
//# sourceMappingURL=ThresholdModel.js.map