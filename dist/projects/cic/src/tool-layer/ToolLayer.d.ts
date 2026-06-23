/**
 * ToolLayer — Factory for all tool adapters
 * Selects "direct" or "wayland" mode via CIC_TOOL_MODE env var
 */
import { ToolMode } from "./types";
import { ShellTool } from "./ShellTool";
import { ModelTool } from "./ModelTool";
import { FileTool } from "./FileTool";
import { HttpTool } from "./HttpTool";
export type { ToolMode };
export declare class ToolLayer {
    private mode;
    private waylandEndpoint?;
    shell: ShellTool;
    model: ModelTool;
    file: FileTool;
    http: HttpTool;
    constructor(mode?: ToolMode, waylandEndpoint?: string);
    getMode(): ToolMode;
    getWaylandEndpoint(): string | undefined;
}
export declare const toolLayer: ToolLayer;
//# sourceMappingURL=ToolLayer.d.ts.map