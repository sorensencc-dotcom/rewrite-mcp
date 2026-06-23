"use strict";
// RTK Entry Point
Object.defineProperty(exports, "__esModule", { value: true });
// Contract loader integration (CIC AI Runtime v1.0.0)
const contract_loader_1 = require("../runtime/contract-loader");
const logger_1 = require("../lib/logger");
try {
    const contract = (0, contract_loader_1.loadRuntimeContract)();
    logger_1.logger.info(`[RTK] Loaded CIC AI Runtime Contract v${contract.version} from ${contract.path}`);
    // Optional: enforce exact version for this RTK release
    // requireContractVersion("1.0.0");
}
catch (err) {
    logger_1.logger.error("[RTK] Failed to load CIC AI Runtime Contract:", err);
    throw err;
}
//# sourceMappingURL=index.js.map