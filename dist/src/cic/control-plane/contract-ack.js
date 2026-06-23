"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeRuntimeContract = acknowledgeRuntimeContract;
const contract_loader_1 = require("../../runtime/contract-loader");
const logger_1 = require("../../lib/logger");
function acknowledgeRuntimeContract() {
    try {
        const c = (0, contract_loader_1.loadRuntimeContract)();
        logger_1.logger.info(`[CIC] Acknowledged CIC AI Runtime Contract v${c.version} at ${c.path}`);
        return { version: c.version, path: c.path, sections: c.sections };
    }
    catch (err) {
        logger_1.logger.error("[CIC] Failed to acknowledge runtime contract:", err);
        throw err;
    }
}
//# sourceMappingURL=contract-ack.js.map