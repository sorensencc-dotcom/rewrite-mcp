import { EntityTimeline } from './EntityTimeline';
export interface MemorySnapshot {
    version: string;
    capturedAt: string;
    entities: EntityTimeline[];
    totalEventCount: number;
    checksumHash: string;
}
export interface ExpansionClaim {
    entityId: string;
    claimType: string;
    statement: string;
    timestamp: string;
    confidence: number;
}
export interface ExpansionContext {
    expansionId: string;
    timestamp: string;
    claims: ExpansionClaim[];
    sourcePhase: string;
}
export interface IMemoryStore {
    /**
     * Retrieve current memory snapshot (point-in-time)
     */
    getSnapshot(snapshotId?: string): Promise<MemorySnapshot>;
    /**
     * Retrieve entity timeline by ID
     */
    getEntityTimeline(entityId: string): Promise<EntityTimeline | null>;
    /**
     * Retrieve all entities of a given type
     */
    getEntitiesByType(entityType: string): Promise<EntityTimeline[]>;
    /**
     * Store/update memory snapshot (for after validation passes)
     */
    storeSnapshot(snapshot: MemorySnapshot): Promise<void>;
    /**
     * Append event to entity timeline
     */
    appendEvent(entityId: string, event: {
        description: string;
        timestamp: string;
        source: string;
        confidence: number;
    }): Promise<void>;
    /**
     * Get audit trail of memory changes
     */
    getAuditTrail(entityId?: string, since?: string): Promise<Array<{
        timestamp: string;
        change: string;
        entityId: string;
    }>>;
}
//# sourceMappingURL=MemorySnapshot.d.ts.map