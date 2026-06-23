"use strict";
/**
 * filename: mcp.ts
 * location: src/config/mcp.ts
 * created: 2026-06-06
 *
 * MCP Server Configuration
 * Defines all 5 MCP servers, ports, methods, and timeouts
 * Reads from environment variables with sensible defaults for local development
 *
 * Environment variables (optional):
 *   MCP_SUMMARIZER_PORT (default: 7070)
 *   MCP_DRIFT_PORT (default: 7071)
 *   MCP_DIAGNOSTICS_PORT (default: 7072)
 *   MCP_DOCS_PORT (default: 7073)
 *   MCP_ORCHESTRATOR_PORT (default: 7074)
 *   MCP_TIMEOUT_DEFAULT (default: 5000ms)
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MCP_CONFIG = exports.MCPConfigManager = void 0;
exports.getMCPConfigManager = getMCPConfigManager;
class MCPConfigManager {
    constructor() {
        this.configs = [
            {
                id: "cic-section-summarizer",
                host: process.env.MCP_HOST || "127.0.0.1",
                port: parseInt(process.env.MCP_SUMMARIZER_PORT || "7070", 10),
                methods: ["cic.summarizeSection"],
                timeout: 5000,
            },
            {
                id: "cic-drift-detector",
                host: process.env.MCP_HOST || "127.0.0.1",
                port: parseInt(process.env.MCP_DRIFT_PORT || "7071", 10),
                methods: ["cic.detectDrift"],
                timeout: 5000,
            },
            {
                id: "cic-env-diagnostics",
                host: process.env.MCP_HOST || "127.0.0.1",
                port: parseInt(process.env.MCP_DIAGNOSTICS_PORT || "7072", 10),
                methods: ["cic.diagnose"],
                timeout: 10000,
            },
            {
                id: "cic-docs-sync",
                host: process.env.MCP_HOST || "127.0.0.1",
                port: parseInt(process.env.MCP_DOCS_PORT || "7073", 10),
                methods: ["cic.syncDocs"],
                timeout: 5000,
            },
            {
                id: "rewrite-labs-orchestrator",
                host: process.env.MCP_HOST || "127.0.0.1",
                port: parseInt(process.env.MCP_ORCHESTRATOR_PORT || "7074", 10),
                methods: ["orchestrate.runTask"],
                timeout: 15000,
            },
        ];
        this.methodIndex = new Map();
        this.configs.forEach((config) => {
            config.methods.forEach((method) => {
                this.methodIndex.set(method, config);
            });
        });
    }
    getConfigForMethod(method) {
        const config = this.methodIndex.get(method);
        if (!config) {
            throw new Error(`No MCP server configured for method: ${method}`);
        }
        return config;
    }
    getAll() {
        return this.configs;
    }
    buildMethodIndex() {
        return new Map(this.methodIndex);
    }
    async validateAllServers() {
        const errors = [];
        for (const config of this.configs) {
            const isHealthy = await this.checkServerHealth(config);
            if (!isHealthy) {
                errors.push(`${config.id} (port ${config.port}) is not responding`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    async checkServerHealth(config) {
        const { createConnection } = await Promise.resolve().then(() => __importStar(require("node:net")));
        return new Promise((resolve) => {
            // Retry logic: wait 2 seconds, then check 5 times with 1-second intervals
            let attempts = 0;
            const maxAttempts = 5;
            const tryConnect = () => {
                const socket = createConnection({
                    host: config.host,
                    port: config.port,
                });
                const timeout = setTimeout(() => {
                    socket.destroy();
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 1000);
                    }
                    else {
                        resolve(false);
                    }
                }, 1000);
                socket.on("connect", () => {
                    clearTimeout(timeout);
                    socket.destroy();
                    resolve(true);
                });
                socket.on("error", () => {
                    clearTimeout(timeout);
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 1000);
                    }
                    else {
                        resolve(false);
                    }
                });
            };
            // Start initial connection attempt after 2 second delay
            setTimeout(tryConnect, 2000);
        });
    }
}
exports.MCPConfigManager = MCPConfigManager;
let configManager = null;
function getMCPConfigManager() {
    if (!configManager) {
        configManager = new MCPConfigManager();
    }
    return configManager;
}
exports.DEFAULT_MCP_CONFIG = new MCPConfigManager();
//# sourceMappingURL=mcp.js.map