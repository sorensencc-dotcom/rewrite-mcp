export interface AdapterOperation {
    type: 'shell' | 'file' | 'http' | 'model' | 'browser';
    operation: string;
    args?: any;
}
export interface TaskExecution {
    taskId: string;
    goalId: string;
    title: string;
    description?: string;
    type?: 'AUTO_EXECUTABLE' | 'OPERATOR_REQUIRED' | 'MANUAL';
    status?: "pending" | "running" | "completed" | "failed";
    owner?: string;
    startTime?: string;
    endTime?: string;
    result?: any;
    error?: string;
    retryCount?: number;
    waylandSessionId?: string;
    adapterOps?: AdapterOperation[];
    aprPlanId?: string;
    expectedDuration?: number;
    isDryRun?: boolean;
}
export interface ExecutionStats {
    activeWorkers: number;
    queueLength: number;
    totalExecuted: number;
    totalFailed: number;
}
export interface ExecutionEpisode {
    id: string;
    timestamp: string;
    tasks: TaskExecution[];
    status: "committed" | "aborted" | "dry_run";
    stats: ExecutionStats;
    logs: string[];
}
export interface AgentRunner {
    run(task: TaskExecution, isDryRun: boolean): Promise<any>;
}
