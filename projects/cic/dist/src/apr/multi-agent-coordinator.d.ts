import { PlanningEpisode, PlanningPlan } from "./types.js";
export declare class MultiAgentCoordinator {
    private workspaceRoot;
    private logPath;
    constructor(workspaceRoot: string);
    runLoop(plan: PlanningPlan, isDryRun?: boolean): PlanningEpisode;
    private logEpisode;
    getEpisodes(): PlanningEpisode[];
}
