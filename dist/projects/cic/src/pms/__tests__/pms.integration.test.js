"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pms_executor_1 = require("../pms.executor");
(0, vitest_1.describe)("PMS Integration Tests", () => {
    (0, vitest_1.test)("PMS integrates with extractors", () => {
        const pms = new pms_executor_1.PMSExecutor();
        pms.initialize();
        const result = pms.execute("image_analysis_v1", {
            filename: "test.jpg",
            mime: "image/jpeg",
        });
        (0, vitest_1.expect)(result.prompt.resolved.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.prompt.resolved).toContain("test.jpg");
        (0, vitest_1.expect)(result.prompt.resolved).toContain("image/jpeg");
    });
});
//# sourceMappingURL=pms.integration.test.js.map