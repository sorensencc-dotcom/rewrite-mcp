"use strict";
/**
 * ToolLayer — Factory for all tool adapters
 * Selects "direct" or "wayland" mode via CIC_TOOL_MODE env var
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolLayer = exports.ToolLayer = void 0;
const ShellTool_1 = require("./ShellTool");
const ModelTool_1 = require("./ModelTool");
const FileTool_1 = require("./FileTool");
const HttpTool_1 = require("./HttpTool");
class ToolLayer {
    constructor(mode, waylandEndpoint) {
        this.mode =
            process.env.CIC_TOOL_MODE || mode || "direct";
        this.waylandEndpoint =
            process.env.WAYLAND_ENDPOINT || waylandEndpoint;
        this.shell = new ShellTool_1.ShellTool(this.mode, this.waylandEndpoint);
        this.model = new ModelTool_1.ModelTool(this.mode, this.waylandEndpoint);
        this.file = new FileTool_1.FileTool(this.mode, this.waylandEndpoint);
        this.http = new HttpTool_1.HttpTool(this.mode, this.waylandEndpoint);
    }
    getMode() {
        return this.mode;
    }
    getWaylandEndpoint() {
        return this.waylandEndpoint;
    }
}
exports.ToolLayer = ToolLayer;
// Singleton instance
exports.toolLayer = new ToolLayer();
//# sourceMappingURL=ToolLayer.js.map