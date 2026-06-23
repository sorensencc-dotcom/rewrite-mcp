/**
 * scheduler.ts
 * E2E background task execution scheduler for active jobs.
 */
export interface ScheduledJob {
    id: string;
    cron: string;
    run: () => Promise<void>;
}
export declare class RuntimeScheduler {
    private jobs;
    private intervals;
    registerJob(job: ScheduledJob): void;
    stopJob(id: string): void;
    stopAll(): void;
}
export declare const scheduler: RuntimeScheduler;
//# sourceMappingURL=scheduler.d.ts.map