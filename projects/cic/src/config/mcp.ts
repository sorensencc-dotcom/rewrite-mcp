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

export interface MCPServerConfig {
  id: string;
  host: string;
  port: number;
  methods: string[];
  timeout: number;
}

export class MCPConfigManager {
  private configs: MCPServerConfig[];
  private methodIndex: Map<string, MCPServerConfig>;

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

  getConfigForMethod(method: string): MCPServerConfig {
    const config = this.methodIndex.get(method);
    if (!config) {
      throw new Error(`No MCP server configured for method: ${method}`);
    }
    return config;
  }

  getAll(): MCPServerConfig[] {
    return this.configs;
  }

  buildMethodIndex(): Map<string, MCPServerConfig> {
    return new Map(this.methodIndex);
  }

  async validateAllServers(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

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

  private async checkServerHealth(config: MCPServerConfig): Promise<boolean> {
    const { createConnection } = await import("node:net");

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
          } else {
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
          } else {
            resolve(false);
          }
        });
      };

      // Start initial connection attempt after 2 second delay
      setTimeout(tryConnect, 2000);
    });
  }
}

let configManager: MCPConfigManager | null = null;

export function getMCPConfigManager(): MCPConfigManager {
  if (!configManager) {
    configManager = new MCPConfigManager();
  }
  return configManager;
}

export const DEFAULT_MCP_CONFIG = new MCPConfigManager();
