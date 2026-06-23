/**
 * Wayland Tool Adapters (Phase 46.2)
 * with Security Hardening (Phase 46.6)
 *
 * Route CIC tool calls (shell/model/file/http) through Wayland.
 * Enforce workspace root scoping (/cic_workspace).
 * Remove all direct OS access from CIC agents.
 * Validate security constraints: no credentials, no interactive shells.
 */
import * as path from 'path';
import SecurityValidator from './security-validator';
const WORKSPACE_ROOT = process.env.CIC_WORKSPACE || '/cic_workspace';
/**
 * Shell Tool Adapter
 * Route shell commands through Wayland.
 * Enforce: non-interactive, workspace scoping.
 */
export class ShellToolAdapter {
    async execute(command, correlationId) {
        // Validate: no interactive flags
        const validation = SecurityValidator.validateShellCommand(command);
        if (!validation.valid) {
            return {
                success: false,
                error: `Security violation: ${validation.violations?.join(', ')}`,
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
    async read(filePath, correlationId) {
        const validation = SecurityValidator.validateFilePath(filePath);
        if (!validation.valid) {
            return {
                success: false,
                error: `Security violation: ${validation.violations?.join(', ')}`,
                correlationId
            };
        }
        const resolved = path.resolve(filePath);
        const normalized = path.normalize(resolved);
        // In production: route to Wayland file endpoint
        return {
            success: true,
            output: `[Wayland] Read: ${normalized}`,
            correlationId
        };
    }
    async write(filePath, content, correlationId) {
        const validation = SecurityValidator.validateFilePath(filePath);
        if (!validation.valid) {
            return {
                success: false,
                error: `Security violation: ${validation.violations?.join(', ')}`,
                correlationId
            };
        }
        const resolved = path.resolve(filePath);
        const normalized = path.normalize(resolved);
        return {
            success: true,
            output: `[Wayland] Wrote ${content.length} bytes to ${normalized}`,
            correlationId
        };
    }
    async delete(filePath, correlationId) {
        const validation = SecurityValidator.validateFilePath(filePath);
        if (!validation.valid) {
            return {
                success: false,
                error: `Security violation: ${validation.violations?.join(', ')}`,
                correlationId
            };
        }
        const resolved = path.resolve(filePath);
        const normalized = path.normalize(resolved);
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
    async call(model, prompt, correlationId) {
        if (!model || !prompt) {
            return {
                success: false,
                error: 'Model and prompt required',
                correlationId
            };
        }
        // Validate prompt for credential leakage
        const validation = SecurityValidator.validatePrompt(prompt);
        if (!validation.valid) {
            return {
                success: false,
                error: `Security violation: ${validation.violations?.join(', ')}`,
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
    async request(method, url, headers, correlationId) {
        const corrId = correlationId || 'unknown';
        if (!method || !url) {
            return {
                success: false,
                error: 'Method and URL required',
                correlationId: corrId
            };
        }
        // Validate URL for credentials
        const urlValidation = SecurityValidator.validateHttpUrl(url);
        if (!urlValidation.valid) {
            return {
                success: false,
                error: `Security violation: ${urlValidation.violations?.join(', ')}`,
                correlationId: corrId
            };
        }
        // Validate headers for credentials
        if (headers) {
            const headerValidation = SecurityValidator.validateHeaders(headers);
            if (!headerValidation.valid) {
                return {
                    success: false,
                    error: `Security violation: ${headerValidation.violations?.join(', ')}`,
                    correlationId: corrId
                };
            }
        }
        // In production: route to Wayland HTTP endpoint
        return {
            success: true,
            output: `[Wayland] ${method} ${url}`,
            correlationId: corrId
        };
    }
}
/**
 * Tool Router
 * Central dispatcher for all CIC tool calls.
 * Enforces security constraints before routing.
 */
export class ToolRouter {
    constructor() {
        this.shellAdapter = new ShellToolAdapter();
        this.fileAdapter = new FileToolAdapter();
        this.modelAdapter = new ModelToolAdapter();
        this.httpAdapter = new HttpToolAdapter();
    }
    async route(call) {
        switch (call.tool) {
            case 'shell':
                return this.shellAdapter.execute(call.args.command, call.correlationId);
            case 'file:read':
                return this.fileAdapter.read(call.args.path, call.correlationId);
            case 'file:write':
                return this.fileAdapter.write(call.args.path, call.args.content, call.correlationId);
            case 'file:delete':
                return this.fileAdapter.delete(call.args.path, call.correlationId);
            case 'model':
                return this.modelAdapter.call(call.args.model, call.args.prompt, call.correlationId);
            case 'http':
                return this.httpAdapter.request(call.args.method, call.args.url, call.args.headers, call.correlationId);
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
//# sourceMappingURL=adapters.js.map