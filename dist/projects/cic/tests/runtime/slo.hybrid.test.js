"use strict";
// File: projects/cic/tests/runtime/slo.hybrid.test.ts | Date: 2026-05-30 | v1.3.4
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const load_campaign_runner_js_1 = require("../../src/slo/load-campaign-runner.js");
(0, vitest_1.describe)("SLO Hybrid — Load Campaign", () => {
    (0, vitest_1.it)("runs a controlled ingestion load", async () => {
        const ingested = [];
        const runner = new load_campaign_runner_js_1.LoadCampaignRunner(async (doc) => { ingested.push(doc); });
        const docs = Array.from({ length: 500 }, (_, i) => ({ id: i }));
        const result = await runner.run(docs, 50, 1000);
        (0, vitest_1.expect)(result.ingested).toBeGreaterThan(40);
        (0, vitest_1.expect)(result.ingested).toBeLessThanOrEqual(60);
    });
});
//# sourceMappingURL=slo.hybrid.test.js.map