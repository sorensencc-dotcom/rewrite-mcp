"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const failure_modes_js_1 = require("../../src/runtime/failure-modes.js");
(0, vitest_1.describe)("Failure Modes Contract", () => {
    (0, vitest_1.it)("RRK failure halts RTK", () => {
        const result = (0, failure_modes_js_1.handleFailure)("RRK_FAILURE");
        (0, vitest_1.expect)(result.action).toBe("HALT_RTK");
    });
    (0, vitest_1.it)("RTK failure prevents CIC advancement", () => {
        const result = (0, failure_modes_js_1.handleFailure)("RTK_FAILURE");
        (0, vitest_1.expect)(result.action).toBe("BLOCK_SECTION_TRACKING");
    });
    (0, vitest_1.it)("CIC failure triggers git-ai drift detection", () => {
        const result = (0, failure_modes_js_1.handleFailure)("CIC_FAILURE");
        (0, vitest_1.expect)(result.action).toBe("RUN_GITAI_DRIFT_CHECK");
    });
    (0, vitest_1.it)("git-ai failure pauses RRK goal generation", () => {
        const result = (0, failure_modes_js_1.handleFailure)("GITAI_FAILURE");
        (0, vitest_1.expect)(result.action).toBe("PAUSE_RRK");
    });
});
//# sourceMappingURL=failure-modes.contract.test.js.map