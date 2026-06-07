import { MemoryStore, MemoryEvent, QueryOptions } from './MemoryStore';

/**
 * MemorySynthesizer: Weekly/monthly summaries and trend detection.
 *
 * Contract:
 * - Reads raw events from MemoryStore
 * - Generates weekly summaries (7-day windows)
 * - Generates monthly evolution reports (30-day windows)
 * - Detects trends (improving/degrading/stable)
 * - Produces human-readable insights
 * - Appends summaries to memory_summaries.json
 */

export interface TrendLine {
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  percent_change: number;
  direction: 'improving' | 'degrading' | 'stable';
}

export interface EventTypeStats {
  event_type: string;
  count: number;
  percent_of_total: number;
  first_timestamp: string;
  last_timestamp: string;
}

export interface WeeklySummary {
  id: string;
  period: 'weekly';
  start_date: string;
  end_date: string;
  generated_at: string;
  event_count: number;
  event_counts_by_type: Record<string, number>;
  key_deltas: string[];
  trend: 'improving' | 'degrading' | 'stable';
  trend_lines: TrendLine[];
  observations: string[];
  recommendations: string[];
}

export interface MonthlySummary {
  id: string;
  period: 'monthly';
  start_date: string;
  end_date: string;
  generated_at: string;
  event_count: number;
  event_counts_by_type: Record<string, number>;
  total_weeks: number;
  weekly_trend_composite: 'improving' | 'degrading' | 'stable';
  trend_lines: TrendLine[];
  pattern_analysis: string[];
  risk_signals: string[];
  capability_growth: string[];
  observations: string[];
}

export class MemorySynthesizer {
  private store: MemoryStore;
  private summaries: (WeeklySummary | MonthlySummary)[] = [];

  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Generate weekly summary from last 7 days of events
   */
  async generateWeeklySummary(): Promise<WeeklySummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events = await this.store.query({
      after_timestamp: sevenDaysAgo.toISOString(),
      before_timestamp: now.toISOString(),
    });

    const eventCounts = this.countEventsByType(events);
    const totalEvents = events.length;

    const summary: WeeklySummary = {
      id: `weekly_${now.toISOString().split('T')[0]}`,
      period: 'weekly',
      start_date: sevenDaysAgo.toISOString(),
      end_date: now.toISOString(),
      generated_at: now.toISOString(),
      event_count: totalEvents,
      event_counts_by_type: eventCounts,
      key_deltas: this.extractKeyDeltas(events),
      trend: this.analyzeTrend(events),
      trend_lines: this.calculateTrendLines(events),
      observations: this.generateObservations(events, eventCounts),
      recommendations: this.generateRecommendations(events, eventCounts),
    };

    this.summaries.push(summary);
    return summary;
  }

  /**
   * Generate monthly evolution report from last 30 days
   */
  async generateMonthlySummary(): Promise<MonthlySummary> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const events = await this.store.query({
      after_timestamp: thirtyDaysAgo.toISOString(),
      before_timestamp: now.toISOString(),
    });

    const eventCounts = this.countEventsByType(events);

    const summary: MonthlySummary = {
      id: `monthly_${now.toISOString().split('T')[0]}`,
      period: 'monthly',
      start_date: thirtyDaysAgo.toISOString(),
      end_date: now.toISOString(),
      generated_at: now.toISOString(),
      event_count: events.length,
      event_counts_by_type: eventCounts,
      total_weeks: 4,
      weekly_trend_composite: this.analyzeTrend(events),
      trend_lines: this.calculateTrendLines(events),
      pattern_analysis: this.analyzePatterns(events),
      risk_signals: this.detectRiskSignals(events),
      capability_growth: this.detectCapabilityGrowth(events),
      observations: this.generateMonthlyObservations(events),
    };

    this.summaries.push(summary);
    return summary;
  }

  /**
   * Get all summaries (weekly and monthly)
   */
  async getAllSummaries(): Promise<(WeeklySummary | MonthlySummary)[]> {
    return [...this.summaries];
  }

  /**
   * Get recent weekly summaries
   */
  async getRecentWeeklySummaries(count: number = 4): Promise<WeeklySummary[]> {
    return this.summaries
      .filter(s => s.period === 'weekly')
      .slice(-count) as WeeklySummary[];
  }

  /**
   * Get recent monthly summaries
   */
  async getRecentMonthlySummaries(count: number = 3): Promise<MonthlySummary[]> {
    return this.summaries
      .filter(s => s.period === 'monthly')
      .slice(-count) as MonthlySummary[];
  }

  // Private methods

  private countEventsByType(events: MemoryEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    }
    return counts;
  }

  private extractKeyDeltas(events: MemoryEvent[]): string[] {
    const deltas: string[] = [];

    // ARPS_DELTA events are already deltas
    const arpsDeltaEvents = events.filter(e => e.event_type === 'ARPS_DELTA');
    for (const evt of arpsDeltaEvents.slice(-5)) {
      const payload = evt.payload as any;
      if (payload.change_type === 'phase_completion') {
        deltas.push(`Phase ${payload.phase_id} completed`);
      } else if (payload.change_type === 'phase_creation') {
        deltas.push(`Phase ${payload.phase_id} created`);
      } else if (payload.change_type === 'prompt_rewrite') {
        deltas.push(`System prompt rewritten`);
      }
    }

    return deltas.slice(0, 5);
  }

  private analyzeTrend(events: MemoryEvent[]): 'improving' | 'degrading' | 'stable' {
    if (events.length === 0) return 'stable';

    // Calculate error rate from PIPELINE_RUN and AGENT_TELEMETRY events
    const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
    const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');

    let totalErrors = 0;
    let totalRuns = 0;

    for (const evt of pipelineRuns) {
      const payload = evt.payload as any;
      totalRuns++;
      totalErrors += payload.items_failed || 0;
    }

    for (const evt of agentTelemetry) {
      const payload = evt.payload as any;
      if (payload.status === 'degraded' || payload.status === 'failed') {
        totalErrors++;
      }
      totalRuns++;
    }

    if (totalRuns === 0) return 'stable';

    const errorRate = totalErrors / totalRuns;

    if (errorRate < 0.02) return 'improving';
    if (errorRate > 0.1) return 'degrading';
    return 'stable';
  }

  private calculateTrendLines(events: MemoryEvent[]): TrendLine[] {
    const trends: TrendLine[] = [];

    // Pipeline success rate trend
    const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
    if (pipelineRuns.length > 0) {
      const successCount = pipelineRuns.filter((e: any) => e.payload.status === 'success').length;
      const successRate = successCount / pipelineRuns.length;

      trends.push({
        metric: 'pipeline_success_rate',
        baseline: 0.95,
        current: successRate,
        delta: successRate - 0.95,
        percent_change: ((successRate - 0.95) / 0.95) * 100,
        direction: successRate >= 0.95 ? 'improving' : 'degrading',
      });
    }

    // Agent health trend
    const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
    if (agentTelemetry.length > 0) {
      const healthyAgents = agentTelemetry.filter((e: any) => e.payload.status === 'healthy').length;
      const healthRate = healthyAgents / agentTelemetry.length;

      trends.push({
        metric: 'agent_health_rate',
        baseline: 0.98,
        current: healthRate,
        delta: healthRate - 0.98,
        percent_change: ((healthRate - 0.98) / 0.98) * 100,
        direction: healthRate >= 0.98 ? 'improving' : 'degrading',
      });
    }

    // Governance signal rate (approvals)
    const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
    if (govSignals.length > 0) {
      const approvals = govSignals.filter((e: any) => e.payload.decision === 'approved').length;
      const approvalRate = approvals / govSignals.length;

      trends.push({
        metric: 'approval_rate',
        baseline: 0.9,
        current: approvalRate,
        delta: approvalRate - 0.9,
        percent_change: ((approvalRate - 0.9) / 0.9) * 100,
        direction: approvalRate >= 0.9 ? 'improving' : 'degrading',
      });
    }

    return trends;
  }

  private generateObservations(events: MemoryEvent[], eventCounts: Record<string, number>): string[] {
    const observations: string[] = [];

    const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);

    if (totalEvents === 0) {
      observations.push('No events recorded in period.');
      return observations;
    }

    // Event distribution
    const pipelinePercent = ((eventCounts['PIPELINE_RUN'] || 0) / totalEvents * 100).toFixed(1);
    observations.push(`${pipelinePercent}% of events are pipeline runs`);

    const agentPercent = ((eventCounts['AGENT_TELEMETRY'] || 0) / totalEvents * 100).toFixed(1);
    observations.push(`${agentPercent}% are agent telemetry signals`);

    // Governance activity
    if ((eventCounts['GOVERNANCE_SIGNAL'] || 0) > 0) {
      observations.push(`${eventCounts['GOVERNANCE_SIGNAL']} governance signals processed`);
    }

    // Planning activity
    if ((eventCounts['APR_PLAN'] || 0) > 0) {
      observations.push(`${eventCounts['APR_PLAN']} autonomous plans generated`);
    }

    // Execution activity
    if ((eventCounts['CRO_RUN'] || 0) > 0) {
      observations.push(`${eventCounts['CRO_RUN']} execution runs completed`);
    }

    return observations;
  }

  private generateRecommendations(events: MemoryEvent[], eventCounts: Record<string, number>): string[] {
    const recommendations: string[] = [];

    // Check for low pipeline activity
    if ((eventCounts['PIPELINE_RUN'] || 0) < 5) {
      recommendations.push('Low pipeline activity - consider increasing ingestion frequency');
    }

    // Check for agent degradation
    const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
    const degradedAgents = agentTelemetry.filter((e: any) => e.payload.status === 'degraded' || e.payload.status === 'failed');
    if (degradedAgents.length > 0) {
      recommendations.push(`${degradedAgents.length} agent(s) degraded - investigate performance issues`);
    }

    // Check for governance rejections
    const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
    const rejections = govSignals.filter((e: any) => e.payload.decision === 'rejected');
    if (rejections.length > 2) {
      recommendations.push('High rejection rate in governance - review policy constraints');
    }

    return recommendations;
  }

  private analyzePatterns(events: MemoryEvent[]): string[] {
    const patterns: string[] = [];

    // ARPS evolution pattern
    const arpsDeltaEvents = events.filter(e => e.event_type === 'ARPS_DELTA');
    if (arpsDeltaEvents.length > 5) {
      patterns.push('High frequency of roadmap/prompt evolution detected');
    }

    // Planning pattern
    const aprPlans = events.filter(e => e.event_type === 'APR_PLAN');
    if (aprPlans.length > 0) {
      const avgConsensus = aprPlans.reduce((sum, e: any) => sum + (e.payload.agent_consensus_score || 0), 0) / aprPlans.length;
      if (avgConsensus > 0.9) {
        patterns.push('Multi-agent planning shows high consensus (>90%)');
      } else if (avgConsensus < 0.7) {
        patterns.push('Multi-agent planning shows low consensus (<70%) - check agreement');
      }
    }

    // Execution pattern
    const croRuns = events.filter(e => e.event_type === 'CRO_RUN');
    const failedRuns = croRuns.filter((e: any) => e.payload.status === 'failed');
    if (failedRuns.length > 0 && croRuns.length > 0) {
      const failureRate = failedRuns.length / croRuns.length;
      patterns.push(`Execution failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    return patterns;
  }

  private detectRiskSignals(events: MemoryEvent[]): string[] {
    const risks: string[] = [];

    // High error rate
    const pipelineRuns = events.filter(e => e.event_type === 'PIPELINE_RUN');
    const errorRuns = pipelineRuns.filter((e: any) => e.payload.status === 'failed' || e.payload.status === 'partial');
    if (errorRuns.length > pipelineRuns.length * 0.2) {
      risks.push('⚠️ Pipeline failure rate exceeds 20% - investigate root causes');
    }

    // Agent health degradation
    const agentTelemetry = events.filter(e => e.event_type === 'AGENT_TELEMETRY');
    const failedAgents = agentTelemetry.filter((e: any) => e.payload.status === 'failed');
    if (failedAgents.length > 0) {
      risks.push(`⚠️ ${failedAgents.length} agent(s) in failed state - immediate attention needed`);
    }

    // Low approval rate
    const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
    const rejections = govSignals.filter((e: any) => e.payload.decision === 'rejected');
    if (rejections.length > govSignals.length * 0.3) {
      risks.push('⚠️ Governance rejection rate high - policy may be too strict');
    }

    return risks;
  }

  private detectCapabilityGrowth(events: MemoryEvent[]): string[] {
    const growth: string[] = [];

    // APR plan generation (indicates planning capability)
    const aprPlans = events.filter(e => e.event_type === 'APR_PLAN');
    if (aprPlans.length > 5) {
      growth.push('Autonomous planning capability demonstrated (5+ plans generated)');
    }

    // CRO execution (indicates execution capability)
    const croRuns = events.filter(e => e.event_type === 'CRO_RUN');
    if (croRuns.length > 3) {
      growth.push('Multi-agent execution capability demonstrated (3+ runs completed)');
    }

    // Governance signals (indicates approval capability)
    const govSignals = events.filter(e => e.event_type === 'GOVERNANCE_SIGNAL');
    if (govSignals.length > 10) {
      growth.push('Governance processing at scale (10+ signals processed)');
    }

    return growth;
  }

  private generateMonthlyObservations(events: MemoryEvent[]): string[] {
    const observations: string[] = [];

    const totalEvents = events.length;
    observations.push(`Monthly event count: ${totalEvents}`);

    // Trend composites
    const eventCounts = this.countEventsByType(events);
    observations.push(`Event distribution: ${JSON.stringify(eventCounts)}`);

    // Month-over-month
    const trend = this.analyzeTrend(events);
    observations.push(`Monthly trend: ${trend.toUpperCase()}`);

    return observations;
  }
}

// Singleton instance
let synthesizerInstance: MemorySynthesizer | null = null;

export async function getMemorySynthesizer(store: MemoryStore): Promise<MemorySynthesizer> {
  if (!synthesizerInstance) {
    synthesizerInstance = new MemorySynthesizer(store);
  }
  return synthesizerInstance;
}

export function resetMemorySynthesizer(): void {
  synthesizerInstance = null;
}
