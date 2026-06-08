import { MemoryEvent } from "../store/memory-store.types";
import { DistillationRule, DistilledEvent } from "./memory-retention.types";

export class MemoryDistiller {
  private rules: Map<string, DistillationRule>;

  constructor() {
    this.rules = new Map(this.getDefaultRules().map((r) => [r.eventType, r]));
  }

  private getDefaultRules(): DistillationRule[] {
    return [
      {
        eventType: "PIPELINE_RUN",
        strategy: "keep_first_last",
        retentionDays: 365,
        keepRatio: 0.2,
      },
      {
        eventType: "AGENT_TELEMETRY",
        strategy: "daily_summary",
        retentionDays: 90,
        groupByField: "agent_name",
      },
      {
        eventType: "GOVERNANCE_SIGNAL",
        strategy: "keep_all",
        retentionDays: 730,
      },
      {
        eventType: "APR_PLAN",
        strategy: "group_summary",
        retentionDays: 365,
        groupByField: "plan_id",
      },
      {
        eventType: "CRO_RUN",
        strategy: "group_summary",
        retentionDays: 90,
        groupByField: "plan_id",
      },
      {
        eventType: "ARPS_DELTA",
        strategy: "keep_all",
        retentionDays: 365,
      },
    ];
  }

  setRule(rule: DistillationRule): void {
    this.rules.set(rule.eventType, rule);
  }

  canDistill(eventType: string): boolean {
    const rule = this.rules.get(eventType);
    return rule !== undefined && rule.strategy !== "keep_all";
  }

  distillEvents(events: MemoryEvent[]): MemoryEvent[] {
    const byType = this.groupByType(events);
    const result: MemoryEvent[] = [];

    for (const [eventType, typeEvents] of byType.entries()) {
      const rule = this.rules.get(eventType);

      if (!rule || rule.strategy === "keep_all") {
        result.push(...typeEvents);
        continue;
      }

      switch (rule.strategy) {
        case "keep_first_last":
          result.push(...this.keepFirstLast(typeEvents));
          break;
        case "daily_summary":
          result.push(...this.dailySummary(typeEvents, rule.groupByField));
          break;
        case "group_summary":
          result.push(...this.groupSummary(typeEvents, rule.groupByField));
          break;
        case "aggregate":
          result.push(...this.aggregate(typeEvents));
          break;
        default:
          result.push(...typeEvents);
      }
    }

    return result.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private groupByType(events: MemoryEvent[]): Map<string, MemoryEvent[]> {
    const map = new Map<string, MemoryEvent[]>();
    for (const event of events) {
      if (!map.has(event.event_type)) {
        map.set(event.event_type, []);
      }
      map.get(event.event_type)!.push(event);
    }
    return map;
  }

  private keepFirstLast(events: MemoryEvent[]): MemoryEvent[] {
    if (events.length <= 2) return events;
    return [events[0], events[events.length - 1]];
  }

  private dailySummary(
    events: MemoryEvent[],
    groupByField?: string
  ): MemoryEvent[] {
    const byDay = new Map<string, MemoryEvent[]>();

    for (const event of events) {
      const day = event.timestamp.split("T")[0];
      if (!byDay.has(day)) {
        byDay.set(day, []);
      }
      byDay.get(day)!.push(event);
    }

    const result: MemoryEvent[] = [];
    for (const [, dayEvents] of byDay.entries()) {
      if (dayEvents.length === 1) {
        result.push(dayEvents[0]);
        continue;
      }

      const summary = this.createSummary(dayEvents, dayEvents[0].event_type);
      result.push(summary);
    }

    return result;
  }

  private groupSummary(
    events: MemoryEvent[],
    groupByField?: string
  ): MemoryEvent[] {
    if (!groupByField) {
      return this.aggregate(events);
    }

    const byGroup = new Map<string, MemoryEvent[]>();
    for (const event of events) {
      const groupValue = (event.payload as Record<string, any>)[groupByField];
      const key = groupValue ? String(groupValue) : "ungrouped";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
      }
      byGroup.get(key)!.push(event);
    }

    const result: MemoryEvent[] = [];
    for (const [, groupEvents] of byGroup.entries()) {
      if (groupEvents.length === 1) {
        result.push(groupEvents[0]);
        continue;
      }

      const summary = this.createSummary(
        groupEvents,
        groupEvents[0].event_type
      );
      result.push(summary);
    }

    return result;
  }

  private aggregate(events: MemoryEvent[]): MemoryEvent[] {
    if (events.length <= 1) return events;

    const summary = this.createSummary(events, events[0].event_type);
    return [summary];
  }

  private createSummary(events: MemoryEvent[], eventType: string): MemoryEvent {
    const summaryData: Record<string, any> = {
      original_count: events.length,
      summarized_at: new Date().toISOString(),
      time_span_start: events[0].timestamp,
      time_span_end: events[events.length - 1].timestamp,
    };

    if (eventType === "AGENT_TELEMETRY") {
      const payloads = events.map((e) => e.payload);
      summaryData.avg_cpu = this.avgOf(payloads, "cpu_usage_percent");
      summaryData.avg_memory = this.avgOf(payloads, "memory_usage_mb");
      summaryData.avg_error_rate = this.avgOf(payloads, "error_rate_percent");
      summaryData.min_uptime = this.minOf(payloads, "uptime_seconds");
      summaryData.max_uptime = this.maxOf(payloads, "uptime_seconds");
    } else if (eventType === "PIPELINE_RUN") {
      const payloads = events.map((e) => e.payload);
      summaryData.total_items = this.sumOf(payloads, "items_processed");
      summaryData.total_successful = this.sumOf(payloads, "items_successful");
      summaryData.total_failed = this.sumOf(payloads, "items_failed");
      summaryData.avg_duration_ms = this.avgOf(payloads, "duration_ms");
    } else if (eventType === "CRO_RUN") {
      summaryData.completed_runs = events.filter(
        (e) => (e.payload as Record<string, any>).status === "completed"
      ).length;
      summaryData.failed_runs = events.filter(
        (e) => (e.payload as Record<string, any>).status === "failed"
      ).length;
    }

    return {
      id: `summary_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: events[events.length - 1].timestamp,
      event_type: eventType,
      source_agent: events[0].source_agent,
      session_id: events[0].session_id,
      correlation_id: events[0].correlation_id,
      payload: summaryData,
      retention_days: 365,
      checksum: "sha256:pending",
      version: 1,
    };
  }

  private avgOf(payloads: Record<string, any>[], field: string): number {
    const values = payloads
      .map((p) => p[field])
      .filter((v) => typeof v === "number");
    return values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  private sumOf(payloads: Record<string, any>[], field: string): number {
    return payloads
      .map((p) => p[field])
      .filter((v) => typeof v === "number")
      .reduce((a, b) => a + b, 0);
  }

  private minOf(payloads: Record<string, any>[], field: string): number {
    const values = payloads
      .map((p) => p[field])
      .filter((v) => typeof v === "number");
    return values.length > 0 ? Math.min(...values) : 0;
  }

  private maxOf(payloads: Record<string, any>[], field: string): number {
    const values = payloads
      .map((p) => p[field])
      .filter((v) => typeof v === "number");
    return values.length > 0 ? Math.max(...values) : 0;
  }
}
