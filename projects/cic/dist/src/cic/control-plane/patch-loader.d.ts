import { InstinctPatch, PatchStatus } from "./patch-model.js";
export declare class PatchLoader {
    private baseDir;
    constructor(baseDir?: string);
    private initializeDirectories;
    listPatches(status?: PatchStatus): InstinctPatch[];
    movePatch(fileName: string, from: PatchStatus, to: PatchStatus, updates?: Partial<InstinctPatch>): Promise<void>;
    /**
     * Directly saves a newly generated proposed patch onto disk.
     */
    saveProposedPatch(patch: Omit<InstinctPatch, "status" | "createdAt" | "createdBy">): void;
}
export declare const patchLoader: PatchLoader;
