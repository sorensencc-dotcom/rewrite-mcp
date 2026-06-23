// telemetry.ts — CIC telemetry and observability hooks
// Records metrics for analyzers, pipelines, service health

interface TelemetryEvent {
  subsystem: string;
  event: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export class Telemetry {
  private events: TelemetryEvent[] = [];

  record(subsystem: string, event: string, value?: number, metadata?: Record<string, unknown>) {
    this.events.push({
      subsystem,
      event,
      value,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  recordLatency(subsystem: string, name: string, latencyMs: number) {
    this.record(subsystem, `${name}.latency`, latencyMs);
  }

  recordCounter(subsystem: string, name: string, count: number = 1) {
    this.record(subsystem, `${name}.count`, count);
  }

  recordGauge(subsystem: string, name: string, value: number) {
    this.record(subsystem, `${name}.gauge`, value);
  }

  recordError(subsystem: string, name: string, error: Error | string) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.record(subsystem, `${name}.error`, undefined, { error: errorMsg });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

export const globalTelemetry = new Telemetry();
