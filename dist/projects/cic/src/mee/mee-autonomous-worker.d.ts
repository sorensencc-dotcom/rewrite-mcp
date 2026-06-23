import { MeeAutonomousEngine, MeeAutonomousJobStore } from "./mee-autonomous-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
export declare class MeeAutonomousWorker {
    private readonly jobs;
    private readonly runs;
    private readonly engine;
    private readonly workspacePath;
    private isRunning;
    private readonly processingJobs;
    constructor(jobs: MeeAutonomousJobStore, runs: MeeRunEngine, engine: MeeAutonomousEngine, workspacePath: string);
    start(intervalMs?: number): Promise<void>;
    private loop;
    stop(): void;
}
//# sourceMappingURL=mee-autonomous-worker.d.ts.map