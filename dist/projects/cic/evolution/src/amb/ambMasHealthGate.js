"use strict";
// File: projects/cic/evolution/src/amb/ambMasHealthGate.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbMasHealthGate = void 0;
const ambMasHealthConfig_js_1 = require("./ambMasHealthConfig.js");
class AmbMasHealthGate {
    constructor(masSnapshot) {
        this.masSnapshot = masSnapshot;
    }
    isMasStableFor(intent) {
        const thresholds = ambMasHealthConfig_js_1.MAS_HEALTH_THRESHOLDS;
        if (this.masSnapshot.globalErrorRate > thresholds.maxGlobalErrorRate) {
            return false;
        }
        if (this.masSnapshot.globalTimeoutRate > thresholds.maxTimeoutRate) {
            return false;
        }
        if (this.masSnapshot.queueBacklogDepth > thresholds.maxBacklogDepth) {
            return false;
        }
        if (this.masSnapshot.criticalAgentsHealth < thresholds.criticalAgentsMinHealth) {
            return false;
        }
        return true;
    }
}
exports.AmbMasHealthGate = AmbMasHealthGate;
//# sourceMappingURL=ambMasHealthGate.js.map