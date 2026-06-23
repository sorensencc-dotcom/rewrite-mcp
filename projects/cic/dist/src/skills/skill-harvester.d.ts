import { SkillGraphStore } from "./skill-graph-store.js";
export declare class SkillHarvester {
    private repoRoot;
    private store;
    constructor(repoRoot: string, store: SkillGraphStore);
    private harvestAgents;
    private harvestPrompts;
    private linkAgentsToSkills;
    run(): void;
}
