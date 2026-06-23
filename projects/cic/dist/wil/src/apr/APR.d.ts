export interface APRTask {
    id: string;
    name: string;
    dependsOn: string[];
}
export interface APRPlan {
    planId: string;
    goal: string;
    taskCount: number;
    tasks: APRTask[];
}
export declare class APR {
    generatePlan(goal: string): Promise<APRPlan>;
}
