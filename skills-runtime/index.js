// Skill Runtime — Main Module
// Unified runtime for all skills with loader, validator, sandbox, telemetry, context

import { loadSkill, getAvailableSkills, getSkillsByPlatform, loadManifest } from "./loader.js";
import { loadSchema, validatePayload, clearSchemaCache } from "./validator.js";
import { runInSandbox, SandboxOptions, runWithRetries } from "./sandbox.js";
import { telemetry } from "./telemetry.js";
import { context } from "./context.js";
import { getDependencies, getTransitiveDependencies, detectCycles, validateDependencies } from "./dependency-graph.js";

export class SkillRuntime {
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 30000;
    this.defaultRetries = options.retries || 0;
    this.collectTelemetry = options.telemetry !== false;
  }

  async invokeSkill(skillName, payload, options = {}) {
    const startTime = Date.now();

    try {
      // Load skill and schema
      const { func: skillFunc } = await loadSkill(skillName);
      const schema = await loadSchema(skillName);

      // Validate payload
      const validation = validatePayload(skillName, payload, schema);
      if (!validation.valid) {
        throw new Error(`Validation failed for ${skillName}: ${validation.errors.map(e => e.message).join(", ")}`);
      }

      // Execute in sandbox
      const sandboxOpts = new SandboxOptions({
        timeout: options.timeout || this.defaultTimeout,
        retries: options.retries || this.defaultRetries
      });
      const result = await runInSandbox(skillFunc, payload, sandboxOpts);

      // Record telemetry
      const duration = Date.now() - startTime;
      if (this.collectTelemetry) {
        telemetry.recordInvocation(skillName, payload, result, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.collectTelemetry) {
        telemetry.recordError(skillName, error, payload, duration);
      }
      throw error;
    }
  }

  getDependencies(skillName) {
    return getDependencies(skillName);
  }

  getTransitiveDependencies(skillName) {
    return getTransitiveDependencies(skillName);
  }

  validateDependencies(skillName) {
    return validateDependencies(skillName);
  }

  hasCycles() {
    return detectCycles();
  }

  async getAvailableSkills() {
    return getAvailableSkills();
  }

  async getSkillsByPlatform(platform) {
    return getSkillsByPlatform(platform);
  }

  async getManifest() {
    return loadManifest();
  }

  getTelemetry(skillName) {
    return telemetry.export(skillName);
  }

  getMetrics(skillName) {
    return telemetry.getMetrics(skillName);
  }

  getContext(namespace) {
    return context.getAll(namespace);
  }

  setContext(namespace, key, value, ttlMs) {
    return context.set(namespace, key, value, ttlMs);
  }

  clearCache() {
    clearSchemaCache();
  }
}

export const runtime = new SkillRuntime();

export { telemetry, context };
export { getDependencies, getTransitiveDependencies, detectCycles };

// MCP Server exports
export { SkillMcpServer, mcpServer } from "./mcp-server.js";
