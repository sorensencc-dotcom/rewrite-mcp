"use strict";
// File: projects/cic/src/slo/load-campaign-runner.ts | Date: 2026-05-30 | v1.3.4
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadCampaignRunner = void 0;
class LoadCampaignRunner {
    constructor(ingestFn) {
        this.ingestFn = ingestFn;
    }
    async run(docs, rate, durationMs) {
        const interval = 1000 / rate;
        const start = Date.now();
        const end = start + durationMs;
        let i = 0;
        while (Date.now() < end && i < docs.length) {
            // Intentionally run synchronously inside the loop or async?
            // The stub uses `this.ingestFn(docs[i])` (no await), let's keep it exactly as scaffolded to preserve original signature and semantics.
            this.ingestFn(docs[i]);
            i++;
            const elapsed = Date.now() - start;
            const targetCount = Math.floor(elapsed / interval);
            if (i < targetCount && i < docs.length) {
                continue;
            }
            await new Promise(r => setTimeout(r, interval));
        }
        return { ingested: i };
    }
}
exports.LoadCampaignRunner = LoadCampaignRunner;
//# sourceMappingURL=load-campaign-runner.js.map