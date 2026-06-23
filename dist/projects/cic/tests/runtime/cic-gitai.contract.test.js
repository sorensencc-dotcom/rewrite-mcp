"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cic_gitai_js_1 = require("../../src/runtime/cic-gitai.js");
(0, vitest_1.describe)("CIC → git-ai Contract", () => {
    (0, vitest_1.it)("emits valid governance deltas", () => {
        const delta = (0, cic_gitai_js_1.generateGovernanceDelta)({
            system: "1.2.1",
            state: "1.3.1",
            roadmap: "2.6.1",
            changes: ["Added Qdrant provider"]
        });
        (0, vitest_1.expect)(delta).toMatchObject({
            system_version: "1.2.1",
            state_version: "1.3.1",
            roadmap_version: "2.6.1"
        });
    });
    (0, vitest_1.it)("rejects deltas missing required fields", () => {
        (0, vitest_1.expect)(() => (0, cic_gitai_js_1.generateGovernanceDelta)({ system: "1.2.1" })).toThrow();
    });
});
//# sourceMappingURL=cic-gitai.contract.test.js.map