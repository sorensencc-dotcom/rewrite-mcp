import { PhasePatch } from "./mee-schema.js";
export interface DiffChunk {
    type: "context" | "add" | "remove";
    oldLine: number | null;
    newLine: number | null;
    content: string;
}
export interface DiffResult {
    path: string;
    oldContent: string | null;
    newContent: string;
    chunks: DiffChunk[];
}
export declare class MeeDiffEngine {
    generateDiff(patch: PhasePatch): DiffResult;
}
//# sourceMappingURL=mee-diff-engine.d.ts.map