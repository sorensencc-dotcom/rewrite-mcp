"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rrk_rtk_js_1 = require("../../src/runtime/rrk-rtk.js");
(0, vitest_1.describe)("RRK → RTK Contract", () => {
    (0, vitest_1.it)("accepts a valid research_goal", () => {
        const goal = {
            type: "research_goal",
            target: "archive://folder/A",
            metadata: { priority: "high" }
        };
        (0, vitest_1.expect)((0, rrk_rtk_js_1.validateRRKGoal)(goal)).toEqual({ ok: true });
    });
    (0, vitest_1.it)("rejects malformed goals", () => {
        const goal = { type: "research_goal" }; // missing target
        (0, vitest_1.expect)((0, rrk_rtk_js_1.validateRRKGoal)(goal).ok).toBe(false);
    });
    (0, vitest_1.it)("rejects unknown goal types", () => {
        const goal = { type: "unknown_goal", target: "x" };
        (0, vitest_1.expect)((0, rrk_rtk_js_1.validateRRKGoal)(goal).ok).toBe(false);
    });
    (0, vitest_1.it)("materializes valid goals into ingestion jobs", () => {
        const goal = {
            type: "ingest_target",
            target: "file://A.jpg"
        };
        const job = (0, rrk_rtk_js_1.materializeGoal)(goal);
        (0, vitest_1.expect)(job).toMatchObject({
            type: "image",
            source: "file://A.jpg"
        });
    });
});
//# sourceMappingURL=rrk-rtk.contract.test.js.map