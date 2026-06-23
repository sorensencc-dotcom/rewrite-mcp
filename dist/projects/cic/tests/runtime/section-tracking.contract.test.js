"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const section_tracking_js_1 = require("../../src/lib/section-tracking.js");
(0, vitest_1.describe)("Section Tracking Contract", () => {
    (0, vitest_1.it)("advances sections monotonically", () => {
        const state = { "0.1-A": "COMPLETE", "0.2": "PENDING" };
        const newState = (0, section_tracking_js_1.advanceSection)("0.2", state);
        (0, vitest_1.expect)(newState["0.2"]).toBe("COMPLETE");
    });
    (0, vitest_1.it)("rejects backward transitions", () => {
        const state = { "0.1-A": "COMPLETE", "0.2": "COMPLETE" };
        (0, vitest_1.expect)(() => (0, section_tracking_js_1.advanceSection)("0.1-A", state)).toThrow();
    });
    (0, vitest_1.it)("rejects unknown sections", () => {
        const state = { "0.1-A": "COMPLETE" };
        (0, vitest_1.expect)(() => (0, section_tracking_js_1.advanceSection)("0.9", state)).toThrow();
    });
});
//# sourceMappingURL=section-tracking.contract.test.js.map