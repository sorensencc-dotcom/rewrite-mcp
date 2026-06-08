// Memory Harvester types

export interface IMemoryHarvester {
  registerPipelineEvent(name: string, run: PipelineRunData): Promise<void>;
  registerTelemetryEvent(agent: AgentTelemetryData): Promise<void>;
  registerGovernanceSignal(signal: GovernanceSignalData): Promise<void>;
  registerPlanEvent(plan: APRPlanData): Promise<void>;
  registerExecutionEvent(run: CRORunData): Promise<void>;
  registerDeltaEvent(delta: ARPSDeltaData): Promise<void>;
  flush(): Promise<void>;
}

// Minimal data structs for harvester input
export interface PipelineRunData {
  pipeline_name: string;
  pipeline_id: string;
  status: "success" | "partial" | "failed";
  start_time: string;
  end_time: string;
  duration_ms: number;
  items_processed: number;
  items_successful: number;
  items_failed: number;
  metrics: {
    throughput_items_per_second: number;
    error_rate_percent: number;
    resource_usage_mb: number;
  };
  error_summary?: string;
  failed_items?: Array<{ item_id: string; error: string; severity: string }>;
}

export interface AgentTelemetryData {
  agent_name: string;
  agent_class: "ingestion" | "processing" | "reasoning" | "planning" | "execution";
  status: "healthy" | "degraded" | "failed";
  uptime_seconds: number;
  task_count: number;
  task_success_rate: number;
  performance: {
    avg_task_duration_ms: number;
    p95_task_duration_ms: number;
    cpu_usage_percent: number;
    memory_usage_mb: number;
    error_rate_percent: number;
  };
  last_error?: string;
  last_error_time?: string;
  degradation_reason?: string;
}

export interface GovernanceSignalData {
  signal_type: "approval" | "rejection" | "escalation" | "zone_violation" | "threshold_crossed" | "constraint_violation";
  entity_type: "skill" | "extraction" | "phase_write" | "cli_command";
  entity_id: string;
  decision: "approved" | "rejected" | "escalated";
  reason: string;
  operator?: string;
  approval_count: number;
  approval_threshold: number;
  metadata?: Record<string, any>;
}

export interface APRPlanData {
  plan_id: string;
  goal: string;
  plan_type: "feature_development" | "bug_fix" | "optimization" | "governance";
  status: "generated" | "in_progress" | "completed" | "failed";
  task_count: number;
  task_graph: Array<{
    id: string;
    name: string;
    depends_on: string[];
    estimated_effort_hours: number;
  }>;
  critical_path_hours: number;
  risk_level: "low" | "medium" | "high";
  risk_factors: string[];
  agent_consensus_score: number;
  agents_involved: string[];
}

export interface CRORunData {
  run_id: string;
  plan_id: string;
  status: "queued" | "running" | "completed" | "failed" | "rolled_back";
  start_time: string;
  end_time: string;
  duration_ms: number;
  step_count: number;
  step_results: Array<{
    step_id: string;
    task_id: string;
    agent_name: string;
    status: "success" | "failed";
    start_time: string;
    end_time: string;
    duration_ms: number;
    output_size_bytes: number;
    error?: string;
  }>;
  failure_info?: Record<string, any>;
  recovery_action?: string;
}

export interface ARPSDeltaData {
  change_type: "phase_completion" | "phase_creation" | "prompt_rewrite" | "instruction_update" | "priority_adjustment";
  phase_id?: string;
  old_value: string;
  new_value: string;
  git_commit: string;
  confidence: number;
  affected_subsystems: string[];
}

export interface HarvesterOptions {
  storePath?: string;
  sourceAgent?: string;
  sessionId?: string;
  correlationId?: string;
  autoFlushThreshold?: number;
  autoFlushIntervalMs?: number;
}
