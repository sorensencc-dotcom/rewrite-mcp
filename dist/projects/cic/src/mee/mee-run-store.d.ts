import { MeeRun, MeeCheckpoint } from "./mee-schema.js";
import { MeeRunStore } from "./mee-run-engine.js";
export declare class FileMeeRunStore implements MeeRunStore {
    readonly baseDir: string;
    constructor(baseDir: string);
    runsFile(): string;
    cpsFile(): string;
    load<T>(file: string): T[];
    private saveAll;
    saveRun(run: MeeRun): void;
    getRun(id: string): MeeRun | undefined;
    listRuns(): MeeRun[];
    saveCheckpoint(cp: MeeCheckpoint): void;
    getCheckpoints(runId: string): MeeCheckpoint[];
}
//# sourceMappingURL=mee-run-store.d.ts.map