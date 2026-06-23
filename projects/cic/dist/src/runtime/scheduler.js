/**
 * scheduler.ts
 * E2E background task execution scheduler for active jobs.
 */
import { ArpsMemoryPipeline } from "../agents/roadmapping/arps-memory-pipeline.js";
import path from "node:path";
import { MemorySubstrate } from "../memory/memory-substrate.js";
import { MemorySynthesizer } from "../memory/memory-synthesizer.js";
import { ArpsMemoryIntegration } from "../agents/roadmapping/arps-memory-integration.js";
export class RuntimeScheduler {
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
export const scheduler = new RuntimeScheduler();
// 1. Define ARPS roadmap refresh task (with Memory Integration)
async function runArpsJob() {
    const memoryLedgerPath = path.resolve(process.cwd(), ".artifacts/memory/ledger.jsonl");
    const substrate = new MemorySubstrate(memoryLedgerPath);
    const arpsIntegration = new ArpsMemoryIntegration(substrate);
    const pipeline = new ArpsMemoryPipeline(process.cwd(), path.resolve(process.cwd(), "docs"), path.resolve(process.cwd(), "projects/cic/pms/registry.yaml"));
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
scheduler.registerJob({
    id: "arps-roadmap-refresh",
    cron: "0 * * * *", // hourly
    run: runArpsJob
});
// 3. Define Memory Synthesizer job
async function runMemorySynthesizerJob() {
    const memoryLedgerPath = path.resolve(process.cwd(), "projects/cic/data/memory-ledger.jsonl");
    const substrate = new MemorySubstrate(memoryLedgerPath);
    const synth = new MemorySynthesizer(substrate);
    await synth.run();
}
// 4. Register memory synthesizer job to run weekly
scheduler.registerJob({
    id: "memory-synthesizer-weekly",
    cron: "0 3 * * 1", // weekly (every Monday at 03:00)
    run: runMemorySynthesizerJob
});
//# sourceMappingURL=scheduler.js.map