import { TaskExecution, AgentRunner } from "./types.js";
export declare class CoreAgentRunner implements AgentRunner {
    run(task: TaskExecution, isDryRun: boolean): Promise<any>;
}
