import { MeePhaseSpec } from "./mee-schema.js";
export declare class FileMeePhaseSpecStore {
    private filePath;
    constructor(baseDir?: string);
    private ensureDir;
    private loadFile;
    private saveFile;
    loadAll(): MeePhaseSpec[];
    get(id: string): MeePhaseSpec | null;
    add(phase: MeePhaseSpec): void;
    update(id: string, partial: Partial<MeePhaseSpec>): void;
    saveAll(phases: MeePhaseSpec[]): void;
}
//# sourceMappingURL=mee-phase-spec-store.d.ts.map