import { MemoryStore } from './MemoryStore';
import { Router } from 'express';
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
export declare class MemoryHarvester {
    private store;
    private metrics;
    private currentSession;
    private requestCounter;
    constructor(store: MemoryStore);
    /**
     * Ingest a single event
     */
    ingestEvent(request: IngestRequest): Promise<IngestResponse>;
    /**
     * Ingest batch of events
     */
    ingestBatch(requests: IngestRequest[]): Promise<IngestResponse[]>;
    /**
     * Get harvester metrics
     */
    getMetrics(): {
        current_session: string;
        request_counter: number;
        events_ingested: number;
        events_rejected: number;
        events_by_type: Record<string, number>;
        last_error: string | null;
    };
    /**
     * Reset session (e.g., on new operator session)
     */
    resetSession(): void;
    private getDefaultRetention;
    private generateSessionId;
    private generateCorrelationId;
}
export declare function createMemoryIngestRouter(harvester: MemoryHarvester): Router;
export declare function getMemoryHarvester(): Promise<MemoryHarvester>;
//# sourceMappingURL=MemoryHarvester.d.ts.map