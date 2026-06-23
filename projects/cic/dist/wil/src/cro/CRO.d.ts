import { ShellAdapter, FileAdapter, ModelAdapter, HttpAdapter, BrowserAdapter } from "../runtime/adapters";
import { APRPlan } from "../apr/APR";
export interface CRORunStep {
    stepId: string;
    taskId: string;
    status: "success" | "failed";
    durationMs: number;
    error?: string;
}
export interface CRORun {
    runId: string;
    planId: string;
    status: "queued" | "running" | "completed" | "failed";
    stepCount: number;
    stepResults: CRORunStep[];
}
export declare class CRO {
    executePlan(plan: APRPlan, adapters: {
        shell: ShellAdapter;
        file: FileAdapter;
        model: ModelAdapter;
        http: HttpAdapter;
        browser: BrowserAdapter;
    }): Promise<CRORun>;
}
