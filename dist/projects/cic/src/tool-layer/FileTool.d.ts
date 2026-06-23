/**
 * FileTool — Read/write files with workspace scoping
 * Direct mode: fs/promises with workspace root validation
 * Wayland mode: POST to Wayland tool endpoint
 */
import { ToolMode } from "./ToolLayer";
import { FileReadInput, FileReadOutput, FileWriteInput, FileWriteOutput } from "./types";
export declare class FileTool {
    private mode;
    private waylandEndpoint?;
    constructor(mode?: ToolMode, waylandEndpoint?: string);
    read(input: FileReadInput): Promise<FileReadOutput>;
    write(input: FileWriteInput): Promise<FileWriteOutput>;
    private readDirect;
    private writeDirect;
    private readWayland;
    private writeWayland;
}
//# sourceMappingURL=FileTool.d.ts.map