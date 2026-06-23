"use strict";
// CIC Core Entry Point
Object.defineProperty(exports, "__esModule", { value: true });
// Contract acknowledgement (CIC AI Runtime v1.0.0)
const contract_ack_1 = require("./control-plane/contract-ack");
try {
    const ack = (0, contract_ack_1.acknowledgeRuntimeContract)();
    if (globalThis?.CIC_HEALTH_REGISTRY) {
        globalThis.CIC_HEALTH_REGISTRY.register("runtime_contract", ack);
    }
}
catch (err) {
    throw err;
}
//# sourceMappingURL=index.js.map