export type SkillNodeType = "skill" | "agent" | "tool" | "lane" | "phase" | "doc" | "external_system";
export type SkillEdgeType = "depends_on" | "implements" | "observes" | "controls" | "documents" | "mirrors";
export interface SkillNode {
    id: string;
    type: SkillNodeType;
    name: string;
    tags?: string[];
    meta?: Record<string, unknown>;
}
export interface SkillEdge {
    from: string;
    to: string;
    type: SkillEdgeType;
    meta?: Record<string, unknown>;
}
export interface SkillGraph {
    nodes: SkillNode[];
    edges: SkillEdge[];
    meta?: Record<string, unknown>;
}
export declare class SkillGraphStore {
    private graphPath;
    constructor(graphPath: string);
    load(): SkillGraph;
    save(graph: SkillGraph): void;
    update(mutator: (g: SkillGraph) => SkillGraph): void;
}
