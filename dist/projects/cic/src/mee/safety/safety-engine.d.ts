import { PhasePatch, MeeSafetyReport } from "../mee-schema.js";
export declare class MeeSafetyEngine {
    private forbiddenPatterns;
    private sensitiveFiles;
    analyze(patches: PhasePatch[]): MeeSafetyReport;
}
//# sourceMappingURL=safety-engine.d.ts.map