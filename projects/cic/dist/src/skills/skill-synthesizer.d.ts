import { SkillGraphStore, SkillNode } from "./skill-graph-store.js";
export interface SkillHotspots {
    orphanSkills: SkillNode[];
    unusedAgents: SkillNode[];
    denseNodes: SkillNode[];
}
export declare class SkillSynthesizer {
    private store;
    constructor(store: SkillGraphStore);
    private dedupe;
    private computeHotspots;
    run(): void;
}
