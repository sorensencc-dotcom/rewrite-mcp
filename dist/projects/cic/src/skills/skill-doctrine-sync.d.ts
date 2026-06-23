import { SkillGraphStore, SkillNode } from "./skill-graph-store.js";
export interface ExternalSkillMapping {
    cicSkillId: string;
    claudeSkillId?: string;
    copilotSkillId?: string;
    antigravityLaneId?: string;
}
export interface DoctrineDriftReport {
    unmappedCicSkills: SkillNode[];
    unmappedExternalSkills: string[];
}
export declare class SkillDoctrineSync {
    private store;
    private mappings;
    constructor(store: SkillGraphStore, mappings: ExternalSkillMapping[]);
    computeDrift(): DoctrineDriftReport;
}
//# sourceMappingURL=skill-doctrine-sync.d.ts.map