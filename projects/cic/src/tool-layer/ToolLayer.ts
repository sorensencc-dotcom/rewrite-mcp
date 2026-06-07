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

export class ToolLayer {
  private mode: ToolMode;
  private waylandEndpoint?: string;

  shell: ShellTool;
  model: ModelTool;
  file: FileTool;
  http: HttpTool;

  constructor(mode?: ToolMode, waylandEndpoint?: string) {
    this.mode =
      (process.env.CIC_TOOL_MODE as ToolMode) || mode || "direct";
    this.waylandEndpoint =
      process.env.WAYLAND_ENDPOINT || waylandEndpoint;

    this.shell = new ShellTool(this.mode, this.waylandEndpoint);
    this.model = new ModelTool(this.mode, this.waylandEndpoint);
    this.file = new FileTool(this.mode, this.waylandEndpoint);
    this.http = new HttpTool(this.mode, this.waylandEndpoint);
  }

  getMode(): ToolMode {
    return this.mode;
  }

  getWaylandEndpoint(): string | undefined {
    return this.waylandEndpoint;
  }
}

// Singleton instance
export const toolLayer = new ToolLayer();
