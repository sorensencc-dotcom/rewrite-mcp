/**
 * scheduler.ts
 * E2E background task execution scheduler for active jobs.
 */

import { RoadmapPipeline } from "../agents/roadmapping/pipeline.js";
import path from "node:path";
import { MemorySubstrate } from "../memory/memory-substrate.js";
import { MemorySynthesizer } from "../memory/memory-synthesizer.js";

export interface ScheduledJob {
  id: string;
  cron: string;
  run: () => Promise<void>;
}

export class RuntimeScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  registerJob(job: ScheduledJob): void {
    this.jobs.set(job.id, job);
    
    // Parse cron to approximate intervals for simple mock runtime execution
    // e.g. "0 * * * *" runs hourly (3600000ms)
    let ms = 3600000; 
    if (job.cron === "*/5 * * * *") ms = 300000; // 5 min
    if (job.cron === "0 0 * * *") ms = 86400000; // daily
    if (job.cron === "0 3 * * 1") ms = 604800000; // weekly

    const interval = setInterval(async () => {
      try {
        console.log(`[RuntimeScheduler] Starting scheduled execution for job: ${job.id}`);
        await job.run();
        console.log(`[RuntimeScheduler] Finished scheduled execution for job: ${job.id}`);
      } catch (err: any) {
        console.error(`[RuntimeScheduler] Job execution failed: ${job.id} — ${err.message}`);
      }
    }, ms);

    this.intervals.set(job.id, interval);
  }

  stopJob(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
    this.jobs.delete(id);
  }

  stopAll(): void {
    for (const [id, interval] of this.intervals.entries()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.jobs.clear();
  }
}

export const scheduler = new RuntimeScheduler();

// 1. Define ARPS roadmap refresh task
async function runArpsJob() {
  const pipeline = new RoadmapPipeline(
    process.cwd(),
    path.resolve(process.cwd(), "docs"),
    path.resolve(process.cwd(), "projects/cic/pms/registry.yaml")
  );

  await pipeline.run({
    dryRun: true,
    verbose: false
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
