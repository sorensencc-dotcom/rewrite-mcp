/**
 * Wayland Tool Adapters (Phase 46.2)
 *
 * Route CIC tool calls (shell/model/file/http) through Wayland.
 * Enforce workspace root scoping (/cic_workspace).
 * Remove all direct OS access from CIC agents.
 */

import * as path from 'path';

const WORKSPACE_ROOT = process.env.CIC_WORKSPACE || '/cic_workspace';

export interface WaylandToolCall {
  tool: string;
  args: Record<string, unknown>;
  correlationId: string;
  timestamp: string;
}

export interface WaylandToolResponse {
  success: boolean;
  output?: string;
  error?: string;
  correlationId: string;
}

/**
 * Shell Tool Adapter
 * Route shell commands through Wayland.
 * Enforce: non-interactive, workspace scoping.
 */
export class ShellToolAdapter {
  async execute(command: string, correlationId: string): Promise<WaylandToolResponse> {
    // Validate: no interactive flags
    if (command.includes('-i') || command.includes('--interactive')) {
      return {
        success: false,
        error: 'Interactive shell commands not allowed',
        correlationId
      };
    }

    // In production: route to Wayland shell endpoint
    // For now: return placeholder
    return {
      success: true,
      output: `[Wayland] Executed: ${command}`,
      correlationId
    };
  }
}

/**
 * File Tool Adapter
 * Route file operations through Wayland.
 * Enforce: workspace root scoping only.
 */
export class FileToolAdapter {
  async read(filePath: string, correlationId: string): Promise<WaylandToolResponse> {
    const resolved = path.resolve(filePath);
    const normalized = path.normalize(resolved);

    // Validate: must be within workspace
    if (!normalized.startsWith(WORKSPACE_ROOT)) {
      return {
        success: false,
        error: `File access denied: ${filePath} (workspace: ${WORKSPACE_ROOT})`,
        correlationId
      };
    }

    // In production: route to Wayland file endpoint
    return {
      success: true,
      output: `[Wayland] Read: ${normalized}`,
      correlationId
    };
  }

  async write(filePath: string, content: string, correlationId: string): Promise<WaylandToolResponse> {
    const resolved = path.resolve(filePath);
    const normalized = path.normalize(resolved);

    if (!normalized.startsWith(WORKSPACE_ROOT)) {
      return {
        success: false,
        error: `File access denied: ${filePath} (workspace: ${WORKSPACE_ROOT})`,
        correlationId
      };
    }

    return {
      success: true,
      output: `[Wayland] Wrote ${content.length} bytes to ${normalized}`,
      correlationId
    };
  }

  async delete(filePath: string, correlationId: string): Promise<WaylandToolResponse> {
    const resolved = path.resolve(filePath);
    const normalized = path.normalize(resolved);

    if (!normalized.startsWith(WORKSPACE_ROOT)) {
      return {
        success: false,
        error: `File access denied: ${filePath}`,
        correlationId
      };
    }

    return {
      success: true,
      output: `[Wayland] Deleted ${normalized}`,
      correlationId
    };
  }
}

/**
 * Model Tool Adapter
 * Route model calls through Wayland.
 * All API keys delegated to Wayland key management.
 */
export class ModelToolAdapter {
  async call(model: string, prompt: string, correlationId: string): Promise<WaylandToolResponse> {
    if (!model || !prompt) {
      return {
        success: false,
        error: 'Model and prompt required',
        correlationId
      };
    }

    // In production: route to Wayland model endpoint
    // Keys are managed by Wayland, not held in CIC config
    return {
      success: true,
      output: `[Wayland] Called model ${model} (keys via Wayland)`,
      correlationId
    };
  }
}

/**
 * HTTP Tool Adapter
 * Route HTTP requests through Wayland.
 */
export class HttpToolAdapter {
  async request(method: string, url: string, correlationId: string): Promise<WaylandToolResponse> {
    if (!method || !url) {
      return {
        success: false,
        error: 'Method and URL required',
        correlationId
      };
    }

    // Validate: no localhost API keys in URL
    if (url.includes('key=') || url.includes('token=')) {
      return {
        success: false,
        error: 'Credentials in URL not allowed',
        correlationId
      };
    }

    // In production: route to Wayland HTTP endpoint
    return {
      success: true,
      output: `[Wayland] ${method} ${url}`,
      correlationId
    };
  }
}

/**
 * Tool Router
 * Central dispatcher for all CIC tool calls.
 */
export class ToolRouter {
  private shellAdapter = new ShellToolAdapter();
  private fileAdapter = new FileToolAdapter();
  private modelAdapter = new ModelToolAdapter();
  private httpAdapter = new HttpToolAdapter();

  async route(call: WaylandToolCall): Promise<WaylandToolResponse> {
    switch (call.tool) {
      case 'shell':
        return this.shellAdapter.execute(call.args.command as string, call.correlationId);
      case 'file:read':
        return this.fileAdapter.read(call.args.path as string, call.correlationId);
      case 'file:write':
        return this.fileAdapter.write(call.args.path as string, call.args.content as string, call.correlationId);
      case 'file:delete':
        return this.fileAdapter.delete(call.args.path as string, call.correlationId);
      case 'model':
        return this.modelAdapter.call(call.args.model as string, call.args.prompt as string, call.correlationId);
      case 'http':
        return this.httpAdapter.request(call.args.method as string, call.args.url as string, call.correlationId);
      default:
        return {
          success: false,
          error: `Unknown tool: ${call.tool}`,
          correlationId: call.correlationId
        };
    }
  }
}

export default ToolRouter;
