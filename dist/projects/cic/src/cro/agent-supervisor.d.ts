import { TaskExecution, AgentRunner } from "./types.js";
export declare class AgentSupervisor {
    private runner;
    private maxRetries;
    constructor(runner: AgentRunner, maxRetries?: number);
    executeWithSupervision(task: TaskExecution, isDryRun: boolean, onLog: (msg: string) => void): Promise<TaskExecution>;
}
//# sourceMappingURL=agent-supervisor.d.ts.map