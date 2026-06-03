// File: projects/cic/src/cro/types.ts | Date: 2026-06-03 | v1.0.0

export interface TaskExecution {
  taskId: string;
  goalId: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  owner: string;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
  retryCount: number;
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
