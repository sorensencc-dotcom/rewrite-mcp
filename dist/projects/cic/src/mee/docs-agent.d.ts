import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole } from "./mee-schema.js";
export declare class DocsAgent implements AgentImpl {
    readonly id: string;
    readonly role: MeeAgentRole;
    constructor(id: string, role?: MeeAgentRole);
    handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}
//# sourceMappingURL=docs-agent.d.ts.map