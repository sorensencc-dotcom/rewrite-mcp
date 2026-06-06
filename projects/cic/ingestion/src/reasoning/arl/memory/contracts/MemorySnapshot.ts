import { EntityTimeline } from './EntityTimeline';

export interface MemorySnapshot {
  version: string;
  capturedAt: string; // ISO 8601
  entities: EntityTimeline[];
  totalEventCount: number;
  checksumHash: string; // For integrity verification
}

export interface ExpansionClaim {
  entityId: string;
  claimType: string; // attribute, event, relationship
  statement: string;
  timestamp: string; // ISO 8601 when claim is being made
  confidence: number; // 0-1
}

export interface ExpansionContext {
  expansionId: string;
  timestamp: string; // ISO 8601
  claims: ExpansionClaim[];
  sourcePhase: string; // which expansion phase generated this
}

// Interface for hooking into persistent memory store (Phase 7.15.1+)
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
  appendEvent(
    entityId: string,
    event: { description: string; timestamp: string; source: string; confidence: number }
  ): Promise<void>;

  /**
   * Get audit trail of memory changes
   */
  getAuditTrail(
    entityId?: string,
    since?: string
  ): Promise<Array<{ timestamp: string; change: string; entityId: string }>>;
}
