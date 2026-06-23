import { TaskExecution, ExecutionEpisode } from "./types.js";
export declare class RuntimeExecutor {
    private workspaceRoot;
    private logPath;
    private maxWorkers;
    private maxQueueLength;
    private supervisor;
    constructor(workspaceRoot: string);
    runBatch(tasks: TaskExecution[], isDryRun?: boolean): Promise<ExecutionEpisode>;
    private logEpisode;
    getEpisodes(): ExecutionEpisode[];
}
//# sourceMappingURL=runtime-executor.d.ts.map