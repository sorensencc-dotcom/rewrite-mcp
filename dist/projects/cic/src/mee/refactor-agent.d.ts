import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole } from "./mee-schema.js";
export declare class RefactorAgent implements AgentImpl {
    readonly id: string;
    readonly role: MeeAgentRole;
    constructor(id: string, role?: MeeAgentRole);
    handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}
//# sourceMappingURL=refactor-agent.d.ts.map