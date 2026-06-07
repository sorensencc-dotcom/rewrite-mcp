import { MemoryEvent, MemoryStore, getMemoryStore } from './MemoryStore';
import { Router, Request, Response } from 'express';

/**
 * MemoryHarvester: Ingest API and event routing for CIC's memory layer.
 *
 * Contract:
 * - Accepts events from ARPS, APR, CRO, agents
 * - Validates and enriches events
 * - Routes to MemoryStore
 * - Provides ingest metrics
 */

export interface IngestRequest {
  event_type: 'ARPS_DELTA' | 'PIPELINE_RUN' | 'AGENT_TELEMETRY' | 'GOVERNANCE_SIGNAL' | 'APR_PLAN' | 'CRO_RUN';
  source_agent: string;
  payload: Record<string, any>;
  retention_days?: number;
  session_id?: string;
  correlation_id?: string;
}

export interface IngestResponse {
  status: 'success' | 'error';
  event_id?: string;
  timestamp?: string;
  error?: string;
  validation_errors?: string[];
}

export class MemoryHarvester {
  private store: MemoryStore;
  private metrics = {
    events_ingested: 0,
    events_rejected: 0,
    events_by_type: {} as Record<string, number>,
    last_error: null as string | null,
  };

  private currentSession = this.generateSessionId();
  private requestCounter = 0;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Ingest a single event
   */
  async ingestEvent(request: IngestRequest): Promise<IngestResponse> {
    try {
      // Auto-generate session/correlation if not provided
      const sessionId = request.session_id || this.currentSession;
      const correlationId = request.correlation_id || this.generateCorrelationId();

      // Default retention
      const retentionDays = request.retention_days || this.getDefaultRetention(request.event_type);

      // Create event
      const event = await this.store.append({
        event_type: request.event_type,
        source_agent: request.source_agent,
        session_id: sessionId,
        correlation_id: correlationId,
        payload: request.payload,
        retention_days: retentionDays,
      });

      // Update metrics
      this.metrics.events_ingested++;
      this.metrics.events_by_type[request.event_type] =
        (this.metrics.events_by_type[request.event_type] || 0) + 1;
      this.metrics.last_error = null;

      return {
        status: 'success',
        event_id: event.id,
        timestamp: event.timestamp,
      };
    } catch (error: any) {
      this.metrics.events_rejected++;
      this.metrics.last_error = error.message;

      // Log validation errors
      const validationErrors = error.message.includes('Schema validation')
        ? [error.message]
        : undefined;

      return {
        status: 'error',
        error: error.message,
        validation_errors: validationErrors,
      };
    }
  }

  /**
   * Ingest batch of events
   */
  async ingestBatch(requests: IngestRequest[]): Promise<IngestResponse[]> {
    return Promise.all(requests.map(req => this.ingestEvent(req)));
  }

  /**
   * Get harvester metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      current_session: this.currentSession,
      request_counter: this.requestCounter,
    };
  }

  /**
   * Reset session (e.g., on new operator session)
   */
  resetSession(): void {
    this.currentSession = this.generateSessionId();
    this.requestCounter = 0;
  }

  // Private methods

  private getDefaultRetention(eventType: string): number {
    const defaults: Record<string, number> = {
      ARPS_DELTA: 90,
      PIPELINE_RUN: 90,
      AGENT_TELEMETRY: 90,
      GOVERNANCE_SIGNAL: 365,
      APR_PLAN: 365,
      CRO_RUN: 90,
    };
    return defaults[eventType] || 90;
  }

  private generateSessionId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `session_${year}${month}${day}_${sequence}`;
  }

  private generateCorrelationId(): string {
    this.requestCounter++;
    const random = Math.random().toString(36).substring(2, 8);
    return `corr_${random}`;
  }
}

// Express router for ingest API
export function createMemoryIngestRouter(harvester: MemoryHarvester): Router {
  const router = Router();

  /**
   * POST /memory/ingest
   * Ingest a single event
   */
  router.post('/ingest', async (req: Request, res: Response) => {
    const result = await harvester.ingestEvent(req.body);

    if (result.status === 'success') {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * POST /memory/ingest/batch
   * Ingest multiple events
   */
  router.post('/ingest/batch', async (req: Request, res: Response) => {
    const results = await harvester.ingestBatch(req.body);
    const successes = results.filter(r => r.status === 'success').length;
    const failures = results.filter(r => r.status === 'error').length;

    res.status(207).json({
      total: results.length,
      successes,
      failures,
      results,
    });
  });

  /**
   * GET /memory/metrics
   * Get harvester metrics
   */
  router.get('/metrics', (req: Request, res: Response) => {
    res.json(harvester.getMetrics());
  });

  /**
   * POST /memory/session/reset
   * Reset session (new operator session)
   */
  router.post('/session/reset', (req: Request, res: Response) => {
    harvester.resetSession();
    res.json({ status: 'ok', new_session: harvester.getMetrics().current_session });
  });

  return router;
}

// Singleton instance
let harvesterInstance: MemoryHarvester | null = null;

export async function getMemoryHarvester(): Promise<MemoryHarvester> {
  if (!harvesterInstance) {
    const store = await getMemoryStore();
    harvesterInstance = new MemoryHarvester(store);
  }
  return harvesterInstance;
}
