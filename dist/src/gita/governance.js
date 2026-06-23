"use strict";
// git-ai Governance Entry Point
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGovernanceDelta = validateGovernanceDelta;
// Contract integration (CIC AI Runtime v1.0.0)
const contract_loader_1 = require("../runtime/contract-loader");
const logger_1 = require("../lib/logger");
let gitaiContractInfo = null;
try {
    gitaiContractInfo = (0, contract_loader_1.loadRuntimeContract)();
    logger_1.logger.info(`[git-ai] Loaded CIC AI Runtime Contract v${gitaiContractInfo.version}`);
}
catch (err) {
    logger_1.logger.error("[git-ai] Failed to load CIC AI Runtime Contract:", err);
    throw err;
}
function validateGovernanceDelta(delta) {
    if (!delta || typeof delta !== "object")
        throw new Error("invalid_delta");
    const required = ["system_version", "state_version", "roadmap_version", "changes"];
    for (const r of required) {
        if (!(r in delta))
            throw new Error(`governance_delta_missing_${r}`);
    }
    const semverRe = /^[0-9]+\.[0-9]+\.[0-9]+$/;
    if (!semverRe.test(delta.system_version))
        throw new Error("invalid_system_version");
    if (!semverRe.test(delta.state_version))
        throw new Error("invalid_state_version");
    if (!semverRe.test(delta.roadmap_version))
        throw new Error("invalid_roadmap_version");
    return true;
}
//# sourceMappingURL=governance.js.map