"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rtk_cic_js_1 = require("../../src/runtime/rtk-cic.js");
const section_tracking_js_1 = require("../../src/lib/section-tracking.js");
vitest_1.vi.mock("../../src/lib/section-tracking.js");
(0, vitest_1.describe)("RTK → CIC Contract", () => {
    (0, vitest_1.it)("accepts a valid ingestion job", async () => {
        const job = {
            job_id: "123",
            type: "image",
            source: "file://A.jpg",
            metadata: {}
        };
        const result = await (0, rtk_cic_js_1.submitIngestionJob)(job);
        (0, vitest_1.expect)(result.ok).toBe(true);
    });
    (0, vitest_1.it)("rejects malformed ingestion jobs", async () => {
        const job = { type: "image" }; // missing fields
        const result = await (0, rtk_cic_js_1.submitIngestionJob)(job);
        (0, vitest_1.expect)(result.ok).toBe(false);
    });
    (0, vitest_1.it)("advances section tracking only after validation", async () => {
        const job = {
            job_id: "123",
            type: "image",
            source: "file://A.jpg"
        };
        await (0, rtk_cic_js_1.submitIngestionJob)(job);
        (0, vitest_1.expect)(section_tracking_js_1.advanceSection).toHaveBeenCalled();
    });
});
//# sourceMappingURL=rtk-cic.contract.test.js.map