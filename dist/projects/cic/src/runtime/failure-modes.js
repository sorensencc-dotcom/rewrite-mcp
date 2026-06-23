"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFailure = handleFailure;
function handleFailure(failureType) {
    switch (failureType) {
        case "RRK_FAILURE":
            return { action: "HALT_RTK" };
        case "RTK_FAILURE":
            return { action: "BLOCK_SECTION_TRACKING" };
        case "CIC_FAILURE":
            return { action: "RUN_GITAI_DRIFT_CHECK" };
        case "GITAI_FAILURE":
            return { action: "PAUSE_RRK" };
        default:
            return { action: "UNKNOWN" };
    }
}
//# sourceMappingURL=failure-modes.js.map