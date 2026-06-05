export interface EntityTimeline {
  entityId: string;
  events: {
    timestamp: string;
    description: string;
  }[];
}

export interface MemorySnapshot {
  id: string;
  entities: EntityTimeline[];
  version: string;
  capturedAt: string;
}
