import { TaskExecution, ExecutionEpisode } from "./types.js";
import { AdapterSet } from "./wayland-adapter-runner.js";
import { SecurityConfig } from "../../wil/src/security/SecurityPolicy.js";
import { MemoryStore } from "../../wil/src/memory/MemoryStore.js";
export declare class RuntimeExecutor {
    private workspaceRoot;
    private logPath;
    private maxWorkers;
    private maxQueueLength;
    private supervisor;
    private memory?;
    constructor(workspaceRoot: string, adapters?: AdapterSet, securityConfig?: SecurityConfig, memory?: MemoryStore);
    runBatch(tasks: TaskExecution[], isDryRun?: boolean): Promise<ExecutionEpisode>;
    private logEpisode;
    getEpisodes(): ExecutionEpisode[];
    getMemoryEvents(): any[];
}
