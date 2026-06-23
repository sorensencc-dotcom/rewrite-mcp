"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerdictSynthesizer = void 0;
const ThresholdModel_1 = require("./ThresholdModel");
class VerdictSynthesizer {
    constructor(thresholdModel) {
        this.thresholdModel = thresholdModel || new ThresholdModel_1.ThresholdModel();
    }
    synthesize(reasoning, confidence, compositeReasoning, driftMagnitude, contradictionSeverity, trace) {
        // If threshold metrics provided, use deterministic threshold model (Phase 7.12)
        if (compositeReasoning !== undefined &&
            driftMagnitude !== undefined &&
            contradictionSeverity !== undefined) {
            const thresholdResult = this.thresholdModel.evaluate({
                compositeReasoning,
                confidence,
                driftMagnitude,
                contradictionSeverity,
            });
            const verdict = {
                decision: thresholdResult.decision,
                confidence,
                reasoning,
                thresholdResult,
                rejectCode: thresholdResult.rejectCode,
            };
            if (trace) {
                verdict.reasoningTrace = trace;
            }
            return verdict;
        }
        // Fallback: legacy confidence-only mode
        const verdict = {
            decision: confidence > 0.8 ? 'ACCEPT' : 'REVIEW_REQUIRED',
            confidence,
            reasoning,
        };
        if (trace) {
            verdict.reasoningTrace = trace;
        }
        return verdict;
    }
}
exports.VerdictSynthesizer = VerdictSynthesizer;
//# sourceMappingURL=VerdictSynthesizer.js.map