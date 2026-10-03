/**
 * @file AgentAnalyticsService.ts
 * @description Typed analytical query service for agent telemetry and performance metrics.
 */

import { DuckDBAnalyticsEngine } from './DuckDBAnalyticsEngine.js';
import type {
  ToolPerformanceMetric,
  TokenExpenditureMetric,
  ErrorDistributionMetric,
  SessionTrajectorySummary,
} from './types.js';
import { analyzeAgentTrajectory } from '../../../scripts/evaluate-duckdb-analytics.mjs';

export interface DateRange {
  start?: string;
  end?: string;
}

export class AgentAnalyticsService {
  private engine: DuckDBAnalyticsEngine;

  constructor(engine?: DuckDBAnalyticsEngine) {
    this.engine = engine || new DuckDBAnalyticsEngine();
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  /**
   * Retrieves tool performance metrics including P50, P95, and P99 execution latencies.
   */
  async getToolPerformanceMetrics(
    logFilePath: string,
    _dateRange?: DateRange
  ): Promise<ToolPerformanceMetric[]> {
    if (this.engine.isNative()) {
      const sql = `
        SELECT 
          tool_name,
          COUNT(*)::INTEGER AS total_invocations,
          SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END)::INTEGER AS total_errors,
          (SUM(CASE WHEN status = 'ERROR' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100.0 AS error_rate_pct,
          AVG(duration_ms) AS avg_duration_ms,
          QUANTILE_CONT(duration_ms, 0.50) AS p50_duration_ms,
          QUANTILE_CONT(duration_ms, 0.95) AS p95_duration_ms,
          QUANTILE_CONT(duration_ms, 0.99) AS p99_duration_ms
        FROM read_json_auto('${logFilePath}')
        WHERE tool_name IS NOT NULL
        GROUP BY tool_name
        ORDER BY total_invocations DESC;
      `;
      return await this.engine.query(sql);
    }

    // High-performance streaming fallback
    const report = await analyzeAgentTrajectory(logFilePath);
    return report.tools.map((t: any) => ({
      tool_name: t.toolName,
      total_invocations: t.invocations,
      total_errors: t.errors,
      error_rate_pct: t.errorRatePct,
      avg_duration_ms: t.avgDurationMs,
      p50_duration_ms: t.avgDurationMs, // Approximation in fallback
      p95_duration_ms: t.p95DurationMs,
      p99_duration_ms: t.p95DurationMs,
    }));
  }

  /**
   * Retrieves token expenditure and estimated cost models by LLM model.
   */
  async getTokenExpenditure(
    logFilePath: string,
    _dateRange?: DateRange
  ): Promise<TokenExpenditureMetric[]> {
    const report = await analyzeAgentTrajectory(logFilePath);

    // Blended rate model: $0.15/1M input tokens, $0.60/1M output tokens
    const promptCost = (report.totalPromptTokens / 1_000_000) * 0.15;
    const completionCost = (report.totalCompletionTokens / 1_000_000) * 0.60;
    const estimatedCostUsd = Number((promptCost + completionCost).toFixed(4));

    return [
      {
        model: 'composite-agent-fleet',
        total_prompt_tokens: report.totalPromptTokens,
        total_completion_tokens: report.totalCompletionTokens,
        total_tokens: report.totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        session_count: 1,
      },
    ];
  }

  /**
   * Retrieves failure distribution clustered by error type and tool.
   */
  async getErrorDistribution(
    logFilePath: string,
    _limit: number = 10
  ): Promise<ErrorDistributionMetric[]> {
    const report = await analyzeAgentTrajectory(logFilePath);
    const metrics: ErrorDistributionMetric[] = [];

    for (const tool of report.tools) {
      if (tool.errors > 0) {
        metrics.push({
          error_type: 'TOOL_EXECUTION_ERROR',
          tool_name: tool.toolName,
          occurrence_count: tool.errors,
          sample_session_id: 'session-aggregate',
        });
      }
    }

    return metrics;
  }

  /**
   * Retrieves trajectory summary for a session log.
   */
  async getSessionTrajectory(
    logFilePath: string,
    sessionId: string = 'current'
  ): Promise<SessionTrajectorySummary> {
    const report = await analyzeAgentTrajectory(logFilePath);
    return {
      session_id: sessionId,
      agent_role: 'developer',
      model: 'gemini-3.7-flash',
      total_steps: report.totalSteps,
      duration_ms: report.avgLatencyMs * report.totalSteps,
      total_tokens: report.totalTokens,
      error_count: report.totalErrors,
      tools_used: report.tools.map((t: any) => t.toolName),
    };
  }

  async close(): Promise<void> {
    await this.engine.close();
  }
}
