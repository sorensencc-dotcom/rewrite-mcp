/**
 * ShellTool — Execute shell commands with safety validation
 * Direct mode: promisified exec() with timeout via AbortController
 * Wayland mode: POST to Wayland tool endpoint
 */
import { ToolMode } from "./ToolLayer";
import { ShellInput, ShellOutput } from "./types";
export declare class ShellTool {
    private mode;
    private waylandEndpoint?;
    constructor(mode?: ToolMode, waylandEndpoint?: string);
    run(input: ShellInput): Promise<ShellOutput>;
    private runDirect;
    private runWayland;
    private validateNonInteractive;
}
