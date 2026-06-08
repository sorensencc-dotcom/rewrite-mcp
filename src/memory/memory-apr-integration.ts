/**
 * Phase 23.4 — Memory-Aware APR (Autonomous Planner) Integration
 * Use memory to inform task planning and historical success rates
 */

import { MemoryLayer } from "./memory-integration";
import { MemoryEvent } from "./memory-substrate";

export interface PlannerMemoryContext {
  historicalSuccessRates: Record<string, number>;
  failureClusters: Array<{
    category: string;
    frequency: number;
    recommendation: string;
  }>;
  recommendedApproaches: Array<{
    approach: string;
    successRate: number;
    confidenceScore: number;
  }>;
  riskFactors: string[];
}

export class APRMemoryIntegration {
  constructor(private memory: MemoryLayer) {}

  /**
   * APR calls this when generating a plan to get historical context
   */
  async getPlanningContext(): Promise<PlannerMemoryContext> {
    const synthesizer = this.memory.getSynthesizer();
    const substrate = this.memory.getSubstrate();

    // Get monthly summary for historical patterns
    const monthlySummary = await synthesizer.synthesizeMonthly();

    // Extract historical success rates by platform
    const historicalSuccessRates = this.extractSuccessRates(
      await substrate.query({ event_type: "PLATFORM_EXTRACTION", limit: 1000 })
    );

    // Identify failure clusters (repeated issues)
    const failureClusters = this.identifyFailureClusters(monthlySummary);

    // Recommend proven approaches
    const recommendedApproaches = this.recommendApproaches(historicalSuccessRates);

    // Identify risk factors from memory
    const riskFactors = monthlySummary.long_horizon_analysis.drift_indicators || [];

    return {
      historicalSuccessRates,
      failureClusters,
      recommendedApproaches,
      riskFactors
    };
  }

  /**
   * APR calls this to estimate task duration based on history
   */
  async estimateTaskDuration(
    taskType: "extraction" | "classification" | "synthesis",
    platform?: string
  ): Promise<{
    estimatedMinutes: number;
    p95Minutes: number;
    confidence: number;
  }> {
    const substrate = this.memory.getSubstrate();

    // Look up historical execution times for this task type
    const events = await substrate.query({
      event_type: "CRO_RUN",
      limit: 100
    });

    const durations = events
      .map((e: any) => (e.payload.duration_ms || 0) / 1000 / 60)
      .filter(d => d > 0)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        estimatedMinutes: 10,
        p95Minutes: 30,
        confidence: 0.3
      };
    }

    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const confidence = Math.min(durations.length / 100, 1.0);

    return {
      estimatedMinutes: median,
      p95Minutes: p95,
      confidence
    };
  }

  /**
   * APR uses this to bias task allocation toward high-confidence agents
   */
  async getAgentRecommendations(): Promise<Array<{
    agentName: string;
    taskSuccessRate: number;
    recommendationScore: number;
    lastFailureTime?: string;
  }>> {
    const substrate = this.memory.getSubstrate();

    const agentEvents = await substrate.query({
      event_type: "AGENT_TELEMETRY",
      limit: 100
    });

    const recommendations = agentEvents.map((evt: any) => {
      const successRate = evt.payload.task_success_rate || 0;
      const errorRate = evt.payload.performance?.error_rate_percent || 0;

      // Recommendation score: success rate minus errors, bounded
      const recommendationScore = Math.max(0, Math.min(1, successRate - errorRate / 100));

      return {
        agentName: evt.payload.agent_name,
        taskSuccessRate: successRate,
        recommendationScore,
        lastFailureTime: evt.payload.last_error_time
      };
    });

    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  private extractSuccessRates(events: MemoryEvent[]): Record<string, number> {
    const platformStats: Record<string, { success: number; total: number }> = {};

    for (const event of events) {
      const platform = (event as any).payload.platform;
      const status = (event as any).payload.status;

      if (!platformStats[platform]) {
        platformStats[platform] = { success: 0, total: 0 };
      }

      platformStats[platform].total++;
      if (status === "success") {
        platformStats[platform].success++;
      }
    }

    const rates: Record<string, number> = {};
    for (const [platform, stats] of Object.entries(platformStats)) {
      rates[platform] = stats.total > 0 ? stats.success / stats.total : 0;
    }

    return rates;
  }

  private identifyFailureClusters(summary: any): Array<{
    category: string;
    frequency: number;
    recommendation: string;
  }> {
    const clusters = [];

    // Check for rate limiting issues
    if (summary.proposals_for_arps.some((p: any) => p.title.toLowerCase().includes("rate limit"))) {
      clusters.push({
        category: "Rate Limiting",
        frequency: 3,
        recommendation: "Implement queue-based extraction or upgrade API tier"
      });
    }

    // Check for platform-specific reliability issues
    if (summary.proposals_for_arps.some((p: any) => p.title.toLowerCase().includes("reliability"))) {
      clusters.push({
        category: "Platform Reliability",
        frequency: 2,
        recommendation: "Review API endpoint configuration and error handling"
      });
    }

    return clusters;
  }

  private recommendApproaches(successRates: Record<string, number>): Array<{
    approach: string;
    successRate: number;
    confidenceScore: number;
  }> {
    const recommendations = [];

    // Recommend platforms with highest success rates
    const sortedPlatforms = Object.entries(successRates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [platform, rate] of sortedPlatforms) {
      if (rate > 0.8) {
        recommendations.push({
          approach: `Prioritize ${platform} extractions (proven success)`,
          successRate: rate,
          confidenceScore: 0.9
        });
      }
    }

    // Recommend general parallelization if success is consistent
    if (recommendations.length > 0) {
      recommendations.push({
        approach: "Parallelize across proven platforms",
        successRate: 0.85,
        confidenceScore: 0.8
      });
    }

    return recommendations;
  }
}
