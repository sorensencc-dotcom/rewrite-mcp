import { PlanningPlan } from "./types.js";
export interface PlannerInputs {
    roadmapDeltas?: any[];
    memoryTrends?: any;
    skillHotspots?: {
        orphanSkills?: any[];
        unusedAgents?: any[];
        denseNodes?: any[];
    };
}
export declare class AutonomousPlanner {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    loadInputs(): PlannerInputs;
    plan(inputs: PlannerInputs): PlanningPlan;
}
//# sourceMappingURL=autonomous-planner.d.ts.map