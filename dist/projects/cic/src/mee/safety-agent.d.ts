import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole } from "./mee-schema.js";
export declare class SafetyAgent implements AgentImpl {
    readonly id: string;
    readonly role: MeeAgentRole;
    private sensitiveFiles;
    constructor(id: string, role?: MeeAgentRole);
    handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}
//# sourceMappingURL=safety-agent.d.ts.map