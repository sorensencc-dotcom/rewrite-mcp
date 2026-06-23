"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gitai_rrk_js_1 = require("../../src/runtime/gitai-rrk.js");
(0, vitest_1.describe)("git-ai → RRK Contract", () => {
    (0, vitest_1.it)("converts governance feedback into research goals", () => {
        const feedback = {
            type: "gap_detected",
            location: "SYSTEM.md",
            description: "Extractor chain undocumented"
        };
        const goal = (0, gitai_rrk_js_1.convertGovernanceFeedback)(feedback);
        (0, vitest_1.expect)(goal).toMatchObject({
            type: "research_goal",
            target: "SYSTEM.md"
        });
    });
    (0, vitest_1.it)("rejects malformed governance feedback", () => {
        const feedback = { type: "gap_detected" }; // missing fields
        (0, vitest_1.expect)(() => (0, gitai_rrk_js_1.convertGovernanceFeedback)(feedback)).toThrow();
    });
});
//# sourceMappingURL=gitai-rrk.contract.test.js.map