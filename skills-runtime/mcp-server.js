// MCP Server — Skill Runtime Integration
// Exposes all 13 skills as MCP tools for Claude Code

import { runtime } from "./index.js";
import { SkillError, ValidationError } from "../skills/shared/errors.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillToolConfig = JSON.parse(readFileSync(`${__dirname}/skill-tool-config.json`, "utf-8"));

export class SkillMcpServer {
  constructor(options = {}) {
    this.runtime = runtime;
    this.config = skillToolConfig;
    this.name = "skill-runtime";
    this.version = "1.0.0";
  }

  // Get list of all skills as MCP tools
  getTools() {
    return this.config.toolMappings.map((mapping) => ({
      name: mapping.toolName,
      description: mapping.description,
      inputSchema: {
        type: "object",
        properties: mapping.schema.properties,
        required: mapping.schema.required || []
      }
    }));
  }

  // Map MCP tool name to skill name
  getSkillName(toolName) {
    const mapping = this.config.toolMappings.find((m) => m.toolName === toolName);
    if (!mapping) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return mapping.skillName;
  }

  // Execute a skill via MCP tool invocation
  async executeTool(toolName, toolInput) {
    const startTime = Date.now();

    try {
      // Resolve tool name to skill name
      const skillName = this.getSkillName(toolName);

      // Invoke skill via runtime
      const result = await this.runtime.invokeSkill(skillName, toolInput, {
        timeout: 60000,
        retries: 1
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ],
        isError: false
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Format error for Claude
      const errorMessage = this.formatError(error, toolName, duration);

      return {
        content: [
          {
            type: "text",
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }

  // Format skill errors for MCP/Claude
  formatError(error, toolName, duration) {
    const base = {
      error: true,
      tool: toolName,
      durationMs: duration,
      timestamp: new Date().toISOString()
    };

    if (error instanceof ValidationError) {
      return JSON.stringify(
        {
          ...base,
          type: "ValidationError",
          message: error.message,
          field: error.field,
          details: "Check tool input against schema"
        },
        null,
        2
      );
    }

    if (error instanceof SkillError) {
      return JSON.stringify(
        {
          ...base,
          type: "SkillError",
          message: error.message,
          skillName: error.skillName,
          details: error.details
        },
        null,
        2
      );
    }

    // Generic error
    return JSON.stringify(
      {
        ...base,
        type: "Error",
        message: error?.message || String(error),
        details: "Unexpected error during skill execution"
      },
      null,
      2
    );
  }

  // Get runtime telemetry for a skill
  getSkillMetrics(skillName) {
    const metrics = this.runtime.getMetrics(skillName);
    if (!metrics) {
      return { error: `No metrics for ${skillName}` };
    }
    return metrics;
  }

  // Get all runtime telemetry
  getAllMetrics() {
    return this.runtime.getTelemetry();
  }

  // Validate a skill's dependencies
  validateSkill(skillName) {
    const validation = this.runtime.validateDependencies(skillName);
    return {
      skillName,
      isValid: validation.isValid,
      dependencies: validation.dependencies,
      missingDependencies: validation.missingDependencies
    };
  }

  // Check for circular dependencies
  checkDependencies() {
    return {
      hasCycles: this.runtime.hasCycles(),
      topologicalOrder: this.getTopoligicalOrder()
    };
  }

  getTopoligicalOrder() {
    const deps = this.runtime.getTransitiveDependencies;
    const allSkills = this.config.toolMappings.map((m) => m.skillName);
    return allSkills;
  }

  // Export MCP server config
  exportConfig() {
    return {
      name: this.name,
      version: this.version,
      tools: this.getTools(),
      telemetry: {
        enabled: true,
        metricsAvailable: this.getAllMetrics()
      }
    };
  }
}

export const mcpServer = new SkillMcpServer();
