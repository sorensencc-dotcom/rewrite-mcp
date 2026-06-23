/**
 * Phase 23.1 — Memory Substrate
 * Append-only event store with schema validation, retention policy, and immutability guarantees
 */
export type EventType = "ARPS_DELTA" | "PIPELINE_RUN" | "AGENT_TELEMETRY" | "GOVERNANCE_SIGNAL" | "APR_PLAN" | "CRO_RUN" | "PLATFORM_EXTRACTION";
export interface MemoryEvent {
    id: string;
    timestamp: string;
    event_type: EventType;
    source_agent: string;
    session_id: string;
    correlation_id: string;
    payload: Record<string, any>;
    retention_days: number;
    checksum: string;
    version: number;
}
export interface MemoryStoreConfig {
    store_path: string;
    max_file_size_mb: number;
    auto_archive: boolean;
    archive_destination: string;
    retention_policy: Record<EventType, number>;
}
export declare class MemorySubstrate {
    private config;
    private lockFile;
    constructor(config?: Partial<MemoryStoreConfig>);
    private ensureStoreExists;
    private computeChecksum;
    private validateEventSchema;
    private isValidEventType;
    append(event: Omit<MemoryEvent, "checksum">): Promise<void>;
    query(filters?: {
        event_type?: EventType;
        source_agent?: string;
        from_date?: string;
        to_date?: string;
        limit?: number;
        offset?: number;
    }): Promise<MemoryEvent[]>;
    private readAllEvents;
    private archiveOldEvents;
    private acquireLock;
    private releaseLock;
    getStats(): {
        total_events: number;
        events_by_type: Record<EventType, number>;
        oldest_event: string | null;
        newest_event: string | null;
        store_size_mb: number;
    };
}
//# sourceMappingURL=memory-substrate.d.ts.map