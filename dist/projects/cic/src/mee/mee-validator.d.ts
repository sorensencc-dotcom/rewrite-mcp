import { PhasePatchSet, PhaseValidationReport } from "./mee-schema.js";
export declare class MeeValidator {
    validate(patch: PhasePatchSet): PhaseValidationReport;
    validatePatchSet(patchSet: PhasePatchSet): PhaseValidationReport;
    validateFileConflicts(patchSet: PhasePatchSet): string[];
    validateSchema(patchSet: PhasePatchSet): string[];
    validateBuild(): Promise<{
        passed: boolean;
        error?: string;
    }>;
    validateTests(): Promise<{
        passed: boolean;
        error?: string;
    }>;
    validateAll(patchSet: PhasePatchSet): Promise<PhaseValidationReport>;
}
//# sourceMappingURL=mee-validator.d.ts.map