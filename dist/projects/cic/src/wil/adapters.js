"use strict";
/**
 * Wayland Tool Adapters (Phase 46.2)
 * with Security Hardening (Phase 46.6)
 *
 * Route CIC tool calls (shell/model/file/http) through Wayland.
 * Enforce workspace root scoping (/cic_workspace).
 * Remove all direct OS access from CIC agents.
 * Validate security constraints: no credentials, no interactive shells.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRouter = exports.HttpToolAdapter = exports.ModelToolAdapter = exports.FileToolAdapter = exports.ShellToolAdapter = void 0;
const path = __importStar(require("path"));
const security_validator_1 = __importDefault(require("./security-validator"));
const WORKSPACE_ROOT = process.env.CIC_WORKSPACE || '/cic_workspace';
/**
 * Shell Tool Adapter
 * Route shell commands through Wayland.
 * Enforce: non-interactive, workspace scoping.
 */
class ShellToolAdapter {
    async execute(command, correlationId) {
        // Validate: no interactive flags
        const validation = security_validator_1.default.validateShellCommand(command);
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
exports.ShellToolAdapter = ShellToolAdapter;
/**
 * File Tool Adapter
 * Route file operations through Wayland.
 * Enforce: workspace root scoping only.
 */
class FileToolAdapter {
    async read(filePath, correlationId) {
        const validation = security_validator_1.default.validateFilePath(filePath);
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
        const validation = security_validator_1.default.validateFilePath(filePath);
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
        const validation = security_validator_1.default.validateFilePath(filePath);
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
exports.FileToolAdapter = FileToolAdapter;
/**
 * Model Tool Adapter
 * Route model calls through Wayland.
 * All API keys delegated to Wayland key management.
 */
class ModelToolAdapter {
    async call(model, prompt, correlationId) {
        if (!model || !prompt) {
            return {
                success: false,
                error: 'Model and prompt required',
                correlationId
            };
        }
        // Validate prompt for credential leakage
        const validation = security_validator_1.default.validatePrompt(prompt);
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
exports.ModelToolAdapter = ModelToolAdapter;
/**
 * HTTP Tool Adapter
 * Route HTTP requests through Wayland.
 */
class HttpToolAdapter {
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
        const urlValidation = security_validator_1.default.validateHttpUrl(url);
        if (!urlValidation.valid) {
            return {
                success: false,
                error: `Security violation: ${urlValidation.violations?.join(', ')}`,
                correlationId: corrId
            };
        }
        // Validate headers for credentials
        if (headers) {
            const headerValidation = security_validator_1.default.validateHeaders(headers);
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
exports.HttpToolAdapter = HttpToolAdapter;
/**
 * Tool Router
 * Central dispatcher for all CIC tool calls.
 * Enforces security constraints before routing.
 */
class ToolRouter {
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
exports.ToolRouter = ToolRouter;
exports.default = ToolRouter;
//# sourceMappingURL=adapters.js.map