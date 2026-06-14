import { MemoryStore, MemoryEvent, QueryOptions } from './MemoryStore';

export interface SignalDetectionResult {
  signal_type: 'semantic' | 'temporal' | 'causal';
  confidence: number;
  events: MemoryEvent[];
  analysis: string;
}

export interface SignalSet {
  semantic_signals: SignalDetectionResult[];
  temporal_signals: SignalDetectionResult[];
  causal_signals: SignalDetectionResult[];
  total_confidence: number;
}

export class MemoryQueryAPI {
  constructor(private store: MemoryStore) {}

  /**
   * Query 1: Find events by event type
   */
  async findByEventType(eventType: string, limit: number = 100): Promise<MemoryEvent[]> {
    const options: QueryOptions = { event_type: eventType, limit };
    return this.store.query(options);
  }

  /**
   * Query 2: Find events by source agent
   */
  async findBySourceAgent(agentName: string, limit: number = 100): Promise<MemoryEvent[]> {
    const options: QueryOptions = { source_agent: agentName, limit };
    return this.store.query(options);
  }

  /**
   * Query 3: Find events in time window
   */
  async findByTimeWindow(
    afterTimestamp: string,
    beforeTimestamp: string,
    limit: number = 100
  ): Promise<MemoryEvent[]> {
    const options: QueryOptions = {
      after_timestamp: afterTimestamp,
      before_timestamp: beforeTimestamp,
      limit,
    };
    return this.store.query(options);
  }

  /**
   * Query 4: Find related events by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<MemoryEvent[]> {
    const options: QueryOptions = { correlation_id: correlationId };
    return this.store.query(options);
  }

  /**
   * Query 5: Detect semantic signals (confidence-based clustering)
   */
  async detectSemanticSignals(threshold: number = 0.7): Promise<SignalDetectionResult[]> {
    const allEvents = await this.store.query({ limit: 10000 });
    const signals: Map<string, MemoryEvent[]> = new Map();

    for (const evt of allEvents) {
      if (evt.event_type === 'GOVERNANCE_SIGNAL' || evt.event_type === 'ARPS_DELTA') {
        const confidence = (evt.payload as any).confidence || 0.8;
        if (confidence >= threshold) {
          const key = `${evt.event_type}-${(evt.payload as any).entity_type || 'unknown'}`;
          if (!signals.has(key)) signals.set(key, []);
          signals.get(key)!.push(evt);
        }
      }
    }

    return Array.from(signals.entries()).map(([key, events]) => ({
      signal_type: 'semantic',
      confidence: (events[0].payload as any).confidence || 0.8,
      events,
      analysis: `Clustered ${events.length} events of type ${key}`,
    }));
  }

  /**
   * Query 6: Detect temporal signals (time-series anomalies)
   */
  async detectTemporalSignals(windowMinutes: number = 60): Promise<SignalDetectionResult[]> {
    const allEvents = await this.store.query({ limit: 10000 });
    const signals: SignalDetectionResult[] = [];

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const recentEvents = allEvents.filter(
      (evt) => Math.abs(new Date(evt.timestamp).getTime() - now) < windowMs
    );

    if (recentEvents.length > 0) {
      const pipelineRuns = recentEvents.filter((evt) => evt.event_type === 'PIPELINE_RUN');
      if (pipelineRuns.length > 1) {
        const avgDuration =
          pipelineRuns.reduce((sum, evt) => sum + ((evt.payload as any).duration_ms || 0), 0) /
          pipelineRuns.length;
        const anomalies = pipelineRuns.filter(
          (evt) => Math.abs(((evt.payload as any).duration_ms || 0) - avgDuration) > avgDuration * 0.5
        );

        if (anomalies.length > 0) {
          signals.push({
            signal_type: 'temporal',
            confidence: Math.min(anomalies.length / pipelineRuns.length, 1.0),
            events: anomalies,
            analysis: `Detected ${anomalies.length} performance anomalies in ${windowMinutes}min window`,
          });
        }
      }
    }

    return signals;
  }

  /**
   * Query 7: Detect causal signals (dependency graph)
   */
  async detectCausalSignals(): Promise<SignalDetectionResult[]> {
    const allEvents = await this.store.query({ limit: 10000 });
    const signals: SignalDetectionResult[] = [];
    const causalities: Map<string, MemoryEvent[]> = new Map();

    // Group by session and correlation to find causal chains
    for (const evt of allEvents) {
      const key = evt.session_id;
      if (!causalities.has(key)) causalities.set(key, []);
      causalities.get(key)!.push(evt);
    }

    // Find chains where agent telemetry precedes pipeline failures
    for (const [sessionId, events] of causalities.entries()) {
      const telemetries = events.filter((e) => e.event_type === 'AGENT_TELEMETRY');
      const failures = events.filter(
        (e) =>
          e.event_type === 'PIPELINE_RUN' &&
          (e.payload as any).status === 'FAILED'
      );

      if (telemetries.length > 0 && failures.length > 0) {
        const sortedEvents = [...telemetries, ...failures].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        signals.push({
          signal_type: 'causal',
          confidence: 0.8,
          events: sortedEvents,
          analysis: `Causal chain: ${telemetries.length} telemetries → ${failures.length} failures in session ${sessionId}`,
        });
      }
    }

    return signals;
  }

  /**
   * Combined signal detection across all types
   */
  async detectAllSignals(
    semanticThreshold: number = 0.7,
    temporalWindowMinutes: number = 60
  ): Promise<SignalSet> {
    const [semantic, temporal, causal] = await Promise.all([
      this.detectSemanticSignals(semanticThreshold),
      this.detectTemporalSignals(temporalWindowMinutes),
      this.detectCausalSignals(),
    ]);

    const totalConfidence = [semantic, temporal, causal]
      .flat()
      .reduce((sum, sig) => sum + sig.confidence, 0) / Math.max([semantic, temporal, causal].flat().length, 1);

    return {
      semantic_signals: semantic,
      temporal_signals: temporal,
      causal_signals: causal,
      total_confidence: totalConfidence,
    };
  }
}
