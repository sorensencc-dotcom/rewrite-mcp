"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStabilityReport = generateStabilityReport;
exports.reportToOperatorDashboard = reportToOperatorDashboard;
const index_1 = require("../src/reasoning/arl/index");
const WeightingModel_1 = require("../src/reasoning/arl/engine/WeightingModel");
async function generateStabilityReport(arlInput) {
    const verdict = await (0, index_1.runArl)(arlInput);
    const report = {
        timestamp: new Date().toISOString(),
        arl: {
            verdict,
            trace: verdict.reasoningTrace || [],
            weights: WeightingModel_1.DEFAULT_WEIGHTS,
        },
    };
    return report;
}
async function reportToOperatorDashboard(arlInput) {
    const report = await generateStabilityReport(arlInput);
    // Expose trace to operator dashboard (CognitionPanel)
    console.log(JSON.stringify({
        timestamp: report.timestamp,
        decision: report.arl.verdict.decision,
        confidence: report.arl.verdict.confidence,
        trace: report.arl.trace,
    }, null, 2));
}
//# sourceMappingURL=generate-stability-report.js.map