/**
 * Phase 23.4 — Memory-Aware Stability Dashboard Integration
 * Wire memory events into Stability Dashboard for visualization
 */

import { MemoryLayer } from "./memory-integration";
import { MemoryEvent } from "./memory-substrate";

export interface DashboardMemoryMetrics {
  eventTimeline: Array<{
    timestamp: string;
    eventType: string;
    description: string;
    platform?: string;
    status: "success" | "failure" | "warning";
  }>;
  trendOverlay: {
    metric: string;
    values: Array<{ timestamp: string; value: number }>;
    threshold: number;
    status: "healthy" | "warning" | "critical";
  };
  summaryCards: Array<{
    title: string;
    value: string | number;
    trend: "up" | "down" | "stable";
    icon: string;
  }>;
}

export class StabilityDashboardMemoryIntegration {
  constructor(private memory: MemoryLayer) {}

  /**
   * Dashboard calls this to populate timeline view with memory events
   */
  async getEventTimeline(days: number = 7): Promise<Array<{
    timestamp: string;
    eventType: string;
    description: string;
    platform?: string;
    status: "success" | "failure" | "warning";
  }>> {
    const substrate = this.memory.getSubstrate();
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const events = await substrate.query({
      from_date: fromDate,
      limit: 500
    });

    return events
      .filter(evt => evt.event_type === "PLATFORM_EXTRACTION")
      .map(evt => ({
        timestamp: evt.timestamp,
        eventType: evt.event_type,
        description: `${(evt.payload as any).extraction_type} from ${(evt.payload as any).platform}`,
        platform: (evt.payload as any).platform,
        status: (evt.payload as any).status === "success" ? "success" : "failure"
      }));
  }

  /**
   * Dashboard calls this to show trend overlays (success rate, error rate, etc.)
   */
  async getTrendOverlay(metric: "success_rate" | "error_rate" | "confidence"): Promise<{
    metric: string;
    values: Array<{ timestamp: string; value: number }>;
    threshold: number;
    status: "healthy" | "warning" | "critical";
  }> {
    const substrate = this.memory.getSubstrate();
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const events = await substrate.query({
      event_type: "PLATFORM_EXTRACTION",
      from_date: fromDate,
      limit: 1000
    });

    let values: Array<{ timestamp: string; value: number }>;
    let threshold: number;

    if (metric === "success_rate") {
      values = this.computeRollingMetric(events, "success_rate", 7);
      threshold = 0.9;
    } else if (metric === "error_rate") {
      values = this.computeRollingMetric(events, "error_rate", 7);
      threshold = 0.1;
    } else {
      values = this.computeRollingMetric(events, "confidence", 7);
      threshold = 0.75;
    }

    const latestValue = values.length > 0 ? values[values.length - 1].value : 0;
    let status: "healthy" | "warning" | "critical";

    if (metric === "error_rate") {
      status = latestValue < threshold * 0.5 ? "healthy" : latestValue < threshold ? "warning" : "critical";
    } else {
      status = latestValue > threshold ? "healthy" : latestValue > threshold * 0.8 ? "warning" : "critical";
    }

    return {
      metric,
      values,
      threshold,
      status
    };
  }

  /**
   * Dashboard calls this for summary cards (quick stats)
   */
  async getSummaryCards(): Promise<Array<{
    title: string;
    value: string | number;
    trend: "up" | "down" | "stable";
    icon: string;
  }>> {
    const synthesizer = this.memory.getSynthesizer();
    const weekly = await synthesizer.synthesizeWeekly();

    const cards = [];

    // Card 1: Success Rate
    const successRate = weekly.key_metrics.success_rate || 0;
    cards.push({
      title: "Success Rate",
      value: `${(successRate * 100).toFixed(1)}%`,
      trend: weekly.trends.direction,
      icon: "check-circle"
    });

    // Card 2: Items Extracted
    const itemsExtracted = weekly.key_metrics.total_items_extracted || 0;
    cards.push({
      title: "Items Extracted",
      value: itemsExtracted,
      trend: "up",
      icon: "package"
    });

    // Card 3: Platforms Queried
    const platformCount = (weekly.key_metrics.platforms_queried || []).length;
    cards.push({
      title: "Active Platforms",
      value: platformCount,
      trend: "stable",
      icon: "globe"
    });

    // Card 4: Sorensen Harvests
    const sorensenCount = weekly.sorensen_specific?.harvests_executed || 0;
    cards.push({
      title: "Sorensen Harvests",
      value: sorensenCount,
      trend: sorensenCount > 2 ? "up" : "stable",
      icon: "film"
    });

    return cards;
  }

  private computeRollingMetric(
    events: MemoryEvent[],
    metricType: "success_rate" | "error_rate" | "confidence",
    windowDays: number
  ): Array<{ timestamp: string; value: number }> {
    const values: Array<{ timestamp: string; value: number }> = [];

    // Group events by day
    const eventsByDay: Record<string, MemoryEvent[]> = {};
    for (const event of events) {
      const day = event.timestamp.slice(0, 10);
      if (!eventsByDay[day]) {
        eventsByDay[day] = [];
      }
      eventsByDay[day].push(event);
    }

    // Compute metric for each day
    for (const [day, dayEvents] of Object.entries(eventsByDay)) {
      let value: number;

      if (metricType === "success_rate") {
        const successCount = dayEvents.filter((e: any) => e.payload.status === "success").length;
        value = dayEvents.length > 0 ? successCount / dayEvents.length : 0;
      } else if (metricType === "error_rate") {
        const failureCount = dayEvents.filter((e: any) => e.payload.status !== "success").length;
        value = dayEvents.length > 0 ? failureCount / dayEvents.length : 0;
      } else {
        const avgConfidence = dayEvents.reduce((sum, e: any) => sum + (e.payload.confidence_score || 0), 0) / dayEvents.length;
        value = avgConfidence;
      }

      values.push({
        timestamp: day,
        value
      });
    }

    return values.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
