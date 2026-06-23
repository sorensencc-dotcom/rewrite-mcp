import { MeeAgentTask, MeeAgentExchange, MeeAutonomousJob, PlanTree, MeeAgentRole, MeeAgentCritique, MeeConsensusResult, PhaseProposal } from "./mee-schema.js";
export interface AgentImpl {
    id: string;
    role: MeeAgentRole;
    handleTask(task: MeeAgentTask): Promise<MeeAgentExchange>;
}
export declare class MeeAgentOrchestrator {
    readonly baseDir: string;
    private agents;
    getAgents(): AgentImpl[];
    constructor(baseDir: string);
    tasksFile(): string;
    exchangesFile(): string;
    loadTasks(): MeeAgentTask[];
    saveTasks(tasks: MeeAgentTask[]): void;
    loadExchanges(): MeeAgentExchange[];
    saveExchanges(exchanges: MeeAgentExchange[]): void;
    registerAgent(agent: AgentImpl): void;
    scheduleTasksForPlan(job: MeeAutonomousJob, plan: PlanTree): MeeAgentTask[];
    dispatchTask(taskId: string): Promise<void>;
    getTaskHistory(taskId: string): MeeAgentExchange[];
    getTasksForJob(jobId: string): MeeAgentTask[];
    getExchangesForJob(jobId: string): MeeAgentExchange[];
    consensusFile(): string;
    loadConsensus(): MeeConsensusResult[];
    saveConsensus(results: MeeConsensusResult[]): void;
    getConsensusForJob(jobId: string, jobProposalIds: string[]): MeeConsensusResult[];
    runCritiqueRound(tasks: MeeAgentTask[]): Promise<MeeAgentExchange[]>;
    runConsensusRound(critiques: MeeAgentCritique[], proposalId?: string, cycle?: number): MeeConsensusResult;
    runRefinementRound(plan: PlanTree, proposals: PhaseProposal[], critiques?: MeeAgentCritique[], jobId?: string): Promise<{
        refinedPlan: PlanTree;
        refinedProposals: PhaseProposal[];
    }>;
}
//# sourceMappingURL=mee-agent-orchestrator.d.ts.map