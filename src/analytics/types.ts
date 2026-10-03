/**
 * @file types.ts
 * @description Core TypeScript type definitions for Embedded DuckDB Agent Analytics.
 */

export type AgentStepStatus = 'SUCCESS' | 'ERROR' | 'CANCELLED';

export interface AgentTelemetryEvent {
  session_id: string;
  step_index: number;
  timestamp: string;
  agent_role: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  tool_name?: string | null;
  duration_ms: number;
  status: AgentStepStatus;
  error_type?: string | null;
  exit_code?: number | null;
}

export interface ToolPerformanceMetric {
  tool_name: string;
  total_invocations: number;
  total_errors: number;
  error_rate_pct: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
}

export interface TokenExpenditureMetric {
  model: string;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  session_count: number;
}

export interface ErrorDistributionMetric {
  error_type: string;
  tool_name: string;
  occurrence_count: number;
  sample_session_id: string;
}

export interface SessionTrajectorySummary {
  session_id: string;
  agent_role: string;
  model: string;
  total_steps: number;
  duration_ms: number;
  total_tokens: number;
  error_count: number;
  tools_used: string[];
}
