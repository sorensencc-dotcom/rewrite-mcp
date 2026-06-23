"use strict";
// RRK Entry Point
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRRKGoal = validateRRKGoal;
// Contract integration (CIC AI Runtime v1.0.0)
const contract_loader_1 = require("../runtime/contract-loader");
const logger_1 = require("../lib/logger");
const rrkContract = (() => {
    try {
        const c = (0, contract_loader_1.loadRuntimeContract)();
        logger_1.logger.info(`[RRK] CIC AI Runtime Contract v${c.version} loaded`);
        return c;
    }
    catch (err) {
        logger_1.logger.error("[RRK] Could not load CIC AI Runtime Contract:", err);
        throw err;
    }
})();
function validateRRKGoal(goal) {
    const allowed = ["research_goal", "gap_fill_goal", "archive_target", "ingest_target"];
    if (!goal || typeof goal !== "object")
        return { ok: false, reason: "invalid_payload" };
    if (!allowed.includes(goal.type))
        return { ok: false, reason: "unknown_goal_type" };
    if (!goal.target)
        return { ok: false, reason: "missing_target" };
    return { ok: true };
}
//# sourceMappingURL=index.js.map