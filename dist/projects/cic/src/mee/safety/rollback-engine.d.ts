import { PhasePatch } from "../mee-schema.js";
export declare class MeeRollbackEngine {
    snapshot(patches: PhasePatch[]): Record<string, string | null>;
    restore(backupMap: Record<string, string | null>): void;
}
//# sourceMappingURL=rollback-engine.d.ts.map