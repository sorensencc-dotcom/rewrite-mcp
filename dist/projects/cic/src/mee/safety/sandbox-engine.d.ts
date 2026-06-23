import { PhasePatch, MeeSandboxResult } from "../mee-schema.js";
export declare class MeeSandboxEngine {
    private readonly config?;
    constructor(config?: {
        mockExec?: boolean;
        mockResult?: boolean;
    } | undefined);
    private copyRecursiveSync;
    validate(patches: PhasePatch[]): Promise<MeeSandboxResult>;
}
//# sourceMappingURL=sandbox-engine.d.ts.map