// File: projects/cic/src/cro/types.ts | Date: 2026-06-03 | v1.0.0

export interface AdapterOperation {
  type: 'shell' | 'file' | 'http' | 'model' | 'browser';
  operation: string; // 'execute', 'read', 'write', 'list', 'get', 'post', 'invoke', etc.
  args?: any; // command string, path, url, model name, options
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

  // WIL integration: optional adapter operations
  waylandSessionId?: string;
  adapterOps?: AdapterOperation[];

  // APR integration: planning context
  aprPlanId?: string; // Links to planning session
  expectedDuration?: number; // Estimated execution time in ms
  isDryRun?: boolean; // Dry-run mode for testing
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
