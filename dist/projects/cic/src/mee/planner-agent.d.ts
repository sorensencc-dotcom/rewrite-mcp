import { AgentImpl } from "./mee-agent-orchestrator.js";
import { MeeAgentTask, MeeAgentExchange, MeeAgentRole } from "./mee-schema.js";
import { PlanningEngine } from "./planning/planning-engine.js";
export declare class PlannerAgent implements AgentImpl {
    readonly id: string;
    readonly role: MeeAgentRole;
    private readonly planning;
    constructor(id: string, role: MeeAgentRole, planning: PlanningEngine);
    handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}
//# sourceMappingURL=planner-agent.d.ts.map