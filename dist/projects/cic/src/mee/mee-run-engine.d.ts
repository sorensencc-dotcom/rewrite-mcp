import { MeeRun, MeeCheckpoint } from "./mee-schema.js";
export interface MeeRunStore {
    saveRun(run: MeeRun): void;
    getRun(id: string): MeeRun | undefined;
    saveCheckpoint(cp: MeeCheckpoint): void;
    getCheckpoints(runId: string): MeeCheckpoint[];
}
export declare class MeeRunEngine {
    private readonly store;
    constructor(store: MeeRunStore);
    createRun(params: {
        proposalIds: string[];
        planId?: string;
    }): MeeRun;
    getRun(id: string): MeeRun | undefined;
    startRun(id: string): MeeRun | undefined;
    checkpoint(runId: string, label: string | undefined, data: Record<string, unknown>): MeeCheckpoint | undefined;
    markStepComplete(runId: string): MeeRun | undefined;
    failRun(runId: string, error: {
        message: string;
        code?: string;
    }): MeeRun | undefined;
    cancelRun(runId: string): MeeRun | undefined;
}
//# sourceMappingURL=mee-run-engine.d.ts.map