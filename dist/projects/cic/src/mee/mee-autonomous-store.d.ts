import { MeeAutonomousJob, MeeRunFailureContext, MeeHealingPlan } from "./mee-schema.js";
import { MeeAutonomousJobStore, MeeRunFailureContextStore, MeeHealingPlanStore } from "./mee-autonomous-engine.js";
export declare class FileMeeAutonomousJobStore implements MeeAutonomousJobStore {
    readonly baseDir: string;
    constructor(baseDir: string);
    jobsFile(): string;
    load<T>(file: string): T[];
    private saveAll;
    save(job: MeeAutonomousJob): void;
    get(id: string): MeeAutonomousJob | undefined;
    list(): MeeAutonomousJob[];
}
export declare class FileMeeRunFailureContextStore implements MeeRunFailureContextStore {
    readonly baseDir: string;
    constructor(baseDir: string);
    failuresFile(): string;
    load<T>(file: string): T[];
    private saveAll;
    save(context: MeeRunFailureContext): void;
    get(runId: string): MeeRunFailureContext | undefined;
    getByJob(jobId: string): MeeRunFailureContext | undefined;
    list(): MeeRunFailureContext[];
}
export declare class FileMeeHealingPlanStore implements MeeHealingPlanStore {
    readonly baseDir: string;
    constructor(baseDir: string);
    plansFile(): string;
    load<T>(file: string): T[];
    private saveAll;
    save(plan: MeeHealingPlan): void;
    get(id: string): MeeHealingPlan | undefined;
    getByParentJob(jobId: string): MeeHealingPlan | undefined;
    list(): MeeHealingPlan[];
}
//# sourceMappingURL=mee-autonomous-store.d.ts.map