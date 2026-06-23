import { RTKAutomationStateTracker } from "./state.js";
import { BurstPlanner } from "./bursts.js";
import { SmokeTestRunner } from "./smoke.js";
export declare class RTKOrchestrator {
    private stateTracker;
    private planner;
    private runner;
    constructor();
    getStateTracker(): RTKAutomationStateTracker;
    getPlanner(): BurstPlanner;
    getRunner(): SmokeTestRunner;
    onSectionOpened(sectionId: string): Promise<void>;
    onSectionAdvanced(sectionId: string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    runBurst(goals: any[], sectionId: string, priority?: "low" | "normal" | "high"): Promise<any>;
}
export declare const orchestrator: RTKOrchestrator;
