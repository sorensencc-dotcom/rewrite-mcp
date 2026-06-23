export interface TimelineEvent {
    timestamp: string;
    description: string;
    source: 'expansion' | 'historical' | 'inferred';
    confidence: number;
}
export interface EntityTimeline {
    entityId: string;
    entityType: string;
    firstMentioned: string;
    lastUpdated: string;
    events: TimelineEvent[];
    attributes: Record<string, string>;
    relationships: Array<{
        relatedEntityId: string;
        relationshipType: string;
        confidence: number;
    }>;
}
export interface EntityTimelineIndex {
    version: string;
    entities: Map<string, EntityTimeline>;
    getEntity(entityId: string): EntityTimeline | undefined;
    getEntitiesByType(entityType: string): EntityTimeline[];
    getEventsForEntity(entityId: string): TimelineEvent[];
    getEventsBetween(entityId: string, start: string, end: string): TimelineEvent[];
}
//# sourceMappingURL=EntityTimeline.d.ts.map