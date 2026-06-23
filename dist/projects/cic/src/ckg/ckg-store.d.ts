export interface CkgNode {
    id: string;
    type: string;
    name: string;
    tags?: string[];
    meta?: Record<string, any>;
}
export interface CkgEdge {
    from: string;
    to: string;
    type: string;
    meta?: Record<string, any>;
}
export interface CkgGraph {
    nodes: CkgNode[];
    edges: CkgEdge[];
    meta?: {
        hotspots?: {
            centralNodes: CkgNode[];
            orphans: CkgNode[];
        };
        drift?: {
            unmappedSkills: any[];
            stateDiscrepancies: any[];
        };
        lastUpdated?: string;
    };
}
export declare class CkgStore {
    private graphPath;
    constructor(graphPath: string);
    load(): CkgGraph;
    save(graph: CkgGraph): void;
    appendNode(node: CkgNode): void;
    appendEdge(edge: CkgEdge): void;
    getNeighborhood(nodeId: string, maxDepth?: number): CkgGraph;
}
//# sourceMappingURL=ckg-store.d.ts.map