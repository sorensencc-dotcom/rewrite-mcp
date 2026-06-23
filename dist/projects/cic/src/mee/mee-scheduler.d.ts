import { MeeAutonomousEngine, MeeAutonomousJobStore } from "./mee-autonomous-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
export declare class MeeScheduler {
    private readonly jobs;
    private readonly runs;
    private readonly engine;
    private readonly workspacePath;
    private readonly concurrencyLimit;
    private isRunning;
    private readonly activeJobs;
    constructor(jobs: MeeAutonomousJobStore, runs: MeeRunEngine, engine: MeeAutonomousEngine, workspacePath: string, concurrencyLimit?: number);
    start(intervalMs?: number): Promise<void>;
    stop(): void;
    private loop;
    tick(): Promise<void>;
    private runJobStepLoop;
    getQueueState(): {
        activeCount: number;
        concurrencyLimit: number;
        activeJobIds: string[];
        pausedJobIds: string[];
        pendingJobIds: string[];
    };
}
//# sourceMappingURL=mee-scheduler.d.ts.map