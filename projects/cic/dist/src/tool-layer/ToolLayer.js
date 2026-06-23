/**
 * ToolLayer — Factory for all tool adapters
 * Selects "direct" or "wayland" mode via CIC_TOOL_MODE env var
 */
import { ShellTool } from "./ShellTool";
import { ModelTool } from "./ModelTool";
import { FileTool } from "./FileTool";
import { HttpTool } from "./HttpTool";
export class ToolLayer {
    constructor(mode, waylandEndpoint) {
        this.mode =
            process.env.CIC_TOOL_MODE || mode || "direct";
        this.waylandEndpoint =
            process.env.WAYLAND_ENDPOINT || waylandEndpoint;
        this.shell = new ShellTool(this.mode, this.waylandEndpoint);
        this.model = new ModelTool(this.mode, this.waylandEndpoint);
        this.file = new FileTool(this.mode, this.waylandEndpoint);
        this.http = new HttpTool(this.mode, this.waylandEndpoint);
    }
    getMode() {
        return this.mode;
    }
    getWaylandEndpoint() {
        return this.waylandEndpoint;
    }
}
// Singleton instance
export const toolLayer = new ToolLayer();
//# sourceMappingURL=ToolLayer.js.map