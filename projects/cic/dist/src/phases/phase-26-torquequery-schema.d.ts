export type TorqueNodeType = 'entity' | 'event' | 'location' | 'timeline';
export type TorqueStability = 'STABLE' | 'TENTATIVE';
export interface TorqueNode {
    id: string;
    type: TorqueNodeType;
    attributes: Record<string, unknown>;
    version: number;
    stability: TorqueStability;
}
export interface TorqueEdge {
    from: string;
    to: string;
    type: string;
}
export interface TorqueManifest {
    source_phase: 25 | 26;
    patch_id: string;
    created_at: string;
}
export interface TorqueQueryIngestionBundle {
    bundle_id: string;
    nodes: TorqueNode[];
    edges: TorqueEdge[];
    manifest: TorqueManifest;
}
export interface TorqueQueryClient {
    queryEntities(filter: EntityFilter): Promise<EntityView[]>;
    queryEvents(filter: EventFilter): Promise<EventView[]>;
    queryGraph(filter: GraphFilter): Promise<GraphView>;
}
export interface EntityFilter {
    type?: string;
    namePattern?: string;
    stability?: TorqueStability;
    limit?: number;
}
export interface EntityView {
    id: string;
    name: string;
    type: string;
    attributes: Record<string, unknown>;
    version: number;
    stability: TorqueStability;
}
export interface EventFilter {
    typePattern?: string;
    entityId?: string;
    timeRange?: {
        start: string;
        end: string;
    };
    limit?: number;
}
export interface EventView {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    relatedEntities: string[];
    timestamp: string;
}
export interface GraphFilter {
    nodeIds?: string[];
    edgeTypes?: string[];
    maxDepth?: number;
}
export interface GraphView {
    nodes: TorqueNode[];
    edges: TorqueEdge[];
    depth: number;
}
