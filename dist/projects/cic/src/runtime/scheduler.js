"use strict";
/**
 * scheduler.ts
 * E2E background task execution scheduler for active jobs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = exports.RuntimeScheduler = void 0;
const arps_memory_pipeline_js_1 = require("../agents/roadmapping/arps-memory-pipeline.js");
const node_path_1 = __importDefault(require("node:path"));
const memory_substrate_js_1 = require("../memory/memory-substrate.js");
const memory_synthesizer_js_1 = require("../memory/memory-synthesizer.js");
const arps_memory_integration_js_1 = require("../agents/roadmapping/arps-memory-integration.js");
class RuntimeScheduler {
    constructor() {
        this.jobs = new Map();
        this.intervals = new Map();
    }
    registerJob(job) {
        this.jobs.set(job.id, job);
        // Parse cron to approximate intervals for simple mock runtime execution
        // e.g. "0 * * * *" runs hourly (3600000ms)
        let ms = 3600000;
        if (job.cron === "*/5 * * * *")
            ms = 300000; // 5 min
        if (job.cron === "0 0 * * *")
            ms = 86400000; // daily
        if (job.cron === "0 3 * * 1")
            ms = 604800000; // weekly
        const interval = setInterval(async () => {
            try {
                console.log(`[RuntimeScheduler] Starting scheduled execution for job: ${job.id}`);
                await job.run();
                console.log(`[RuntimeScheduler] Finished scheduled execution for job: ${job.id}`);
            }
            catch (err) {
                console.error(`[RuntimeScheduler] Job execution failed: ${job.id} — ${err.message}`);
            }
        }, ms);
        this.intervals.set(job.id, interval);
    }
    stopJob(id) {
        const interval = this.intervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(id);
        }
        this.jobs.delete(id);
    }
    stopAll() {
        for (const [id, interval] of this.intervals.entries()) {
            clearInterval(interval);
        }
        this.intervals.clear();
        this.jobs.clear();
    }
}
exports.RuntimeScheduler = RuntimeScheduler;
exports.scheduler = new RuntimeScheduler();
// 1. Define ARPS roadmap refresh task (with Memory Integration)
async function runArpsJob() {
    const memoryLedgerPath = node_path_1.default.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
    const substrate = new memory_substrate_js_1.MemorySubstrate(memoryLedgerPath);
    const arpsIntegration = new arps_memory_integration_js_1.ArpsMemoryIntegration(substrate);
    const pipeline = new arps_memory_pipeline_js_1.ArpsMemoryPipeline(process.cwd(), node_path_1.default.resolve(process.cwd(), "docs"), node_path_1.default.resolve(process.cwd(), "projects/cic/pms/registry.yaml"));
    // Get memory-informed hints to influence roadmap synthesis
    const hints = arpsIntegration.buildArpsHints();
    if (hints.repeatedFailures > 0 || hints.stalePhases > 0) {
        console.log(`[ARPS Job] Memory context: ${hints.repeatedFailures} failures, ${hints.stalePhases} stale phases detected`);
    }
    await pipeline.run({
        dryRun: true,
        verbose: false,
        sessionId: `arps-${Date.now()}`
    });
}
// 2. Register job to refresh hourly
exports.scheduler.registerJob({
    id: "arps-roadmap-refresh",
    cron: "0 * * * *", // hourly
    run: runArpsJob
});
// 3. Define Memory Synthesizer job
async function runMemorySynthesizerJob() {
    const memoryLedgerPath = node_path_1.default.resolve(process.cwd(), "projects/cic/data/memory-ledger.jsonl");
    const substrate = new memory_substrate_js_1.MemorySubstrate(memoryLedgerPath);
    const synth = new memory_synthesizer_js_1.MemorySynthesizer(substrate);
    await synth.run();
}
// 4. Register memory synthesizer job to run weekly
exports.scheduler.registerJob({
    id: "memory-synthesizer-weekly",
    cron: "0 3 * * 1", // weekly (every Monday at 03:00)
    run: runMemorySynthesizerJob
});
//# sourceMappingURL=scheduler.js.map