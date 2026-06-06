export interface TimelineEvent {
  timestamp: string; // ISO 8601
  description: string;
  source: 'expansion' | 'historical' | 'inferred';
  confidence: number; // 0-1
}

export interface EntityTimeline {
  entityId: string;
  entityType: string; // person, place, concept, event, artifact
  firstMentioned: string; // ISO 8601
  lastUpdated: string; // ISO 8601
  events: TimelineEvent[];
  attributes: Record<string, string>; // key facts: age, location, role, etc
  relationships: Array<{
    relatedEntityId: string;
    relationshipType: string; // parent, colleague, located_in, etc
    confidence: number;
  }>;
}

export interface EntityTimelineIndex {
  version: string;
  entities: Map<string, EntityTimeline>;

  // Query helpers
  getEntity(entityId: string): EntityTimeline | undefined;
  getEntitiesByType(entityType: string): EntityTimeline[];
  getEventsForEntity(entityId: string): TimelineEvent[];
  getEventsBetween(entityId: string, start: string, end: string): TimelineEvent[];
}
