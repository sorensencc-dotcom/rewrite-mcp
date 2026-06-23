import { IngestionBurst } from "./types";
export declare class BurstPlanner {
    private activeBursts;
    planBurst(goals: any[], sectionId: string, priority?: "low" | "normal" | "high"): IngestionBurst;
    dispatchBurst(burst: IngestionBurst, jobs: any[]): Promise<{
        successCount: number;
        failureCount: number;
    }>;
}
