import { AutonomousPlanner, PlannerInputs } from './autonomous-planner.js';
import { RuntimeExecutor } from '../cro/runtime-executor.js';
import { PlanningPlan } from './types.js';
export interface PlanExecutionResult {
    planId: string;
    goalCount: number;
    taskCount: number;
    executedTasks: number;
    failedTasks: number;
    results: Array<{
        taskId: string;
        status: 'success' | 'failed';
        error?: string;
        duration: number;
    }>;
}
export declare class PlannerExecutorBridge {
    private planner;
    private executor;
    private converter;
    constructor(planner: AutonomousPlanner, executor: RuntimeExecutor);
    executePlan(inputs: PlannerInputs): Promise<PlanExecutionResult>;
    private executeTask;
    getPlan(inputs: PlannerInputs): PlanningPlan;
}
