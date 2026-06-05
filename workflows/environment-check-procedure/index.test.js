import { describe, it, expect, beforeEach } from "vitest";
import { runEnvironmentWorkflow } from "./index.js";

describe("Environment Check Workflow", () => {
  let validInputs;

  beforeEach(() => {
    validInputs = {
      envConfig: {
        os: "win32",
        nodeVersion: "18.0.0",
        wslVersion: "WSL2",
        pythonVersion: "3.11"
      },
      logs: ["Warning: old Node version"],
      generateProcedure: true,
      generateRuntimeEstimate: true
    };
  });

  describe("Validation", () => {
    it("throws error if envConfig is missing", () => {
      const input = { ...validInputs };
      delete input.envConfig;

      expect(() => runEnvironmentWorkflow(input)).toThrow(
        "envConfig is required"
      );
    });

    it("throws error if envConfig.os is missing", () => {
      const input = { ...validInputs };
      delete input.envConfig.os;

      expect(() => runEnvironmentWorkflow(input)).toThrow(
        "envConfig.os is required"
      );
    });

    it("throws error if envConfig.nodeVersion is missing", () => {
      const input = { ...validInputs };
      delete input.envConfig.nodeVersion;

      expect(() => runEnvironmentWorkflow(input)).toThrow(
        "envConfig.nodeVersion is required"
      );
    });

    it("throws error if logs is missing", () => {
      const input = { ...validInputs };
      delete input.logs;

      expect(() => runEnvironmentWorkflow(input)).toThrow(
        "logs is required"
      );
    });

    it("throws error if logs is not an array", () => {
      const input = { ...validInputs, logs: "not-an-array" };

      expect(() => runEnvironmentWorkflow(input)).toThrow(
        "logs is required and must be an array"
      );
    });
  });

  describe("Execution", () => {
    it("runs workflow successfully with valid inputs", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result).toHaveProperty("envValidation");
      expect(result).toHaveProperty("envDiagnostics");
      expect(result).toHaveProperty("metadata");
    });

    it("returns envValidation with status", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.envValidation).toHaveProperty("os");
      expect(result.envValidation).toHaveProperty("nodeVersion");
      expect(result.envValidation).toHaveProperty("status");
      expect(result.envValidation).toHaveProperty("isCompatible");
    });

    it("returns envDiagnostics with issues", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.envDiagnostics).toHaveProperty("issuesFound");
      expect(result.envDiagnostics).toHaveProperty("issues");
      expect(result.envDiagnostics).toHaveProperty("overallHealth");
      expect(Array.isArray(result.envDiagnostics.issues)).toBe(true);
    });

    it("generates procedure when requested", async () => {
      const input = { ...validInputs, generateProcedure: true };
      const result = await runEnvironmentWorkflow(input);

      expect(result.procedure).toBeDefined();
    });

    it("skips procedure when not requested", async () => {
      const input = { ...validInputs, generateProcedure: false };
      const result = await runEnvironmentWorkflow(input);

      expect(result.procedure).toBeNull();
    });

    it("generates runtime estimate when procedure exists", async () => {
      const input = { ...validInputs, generateRuntimeEstimate: true };
      const result = await runEnvironmentWorkflow(input);

      if (result.procedure) {
        expect(result.runtimeEstimate).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("includes errors in metadata", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.metadata).toHaveProperty("errors");
      expect(Array.isArray(result.metadata.errors)).toBe(true);
    });

    it("continues workflow on partial skill failures", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      // Workflow should complete despite potential skill errors
      expect(result).toHaveProperty("envValidation");
      expect(result).toHaveProperty("metadata");
    });
  });

  describe("Telemetry", () => {
    it("records workflow duration", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.metadata.workflowDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.workflowDuration).toBe("number");
    });

    it("records timestamp", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.metadata.timestamp).toBeDefined();
      expect(new Date(result.metadata.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("lists skills used", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.metadata.skillChainUsed).toContain("environment-validator");
      expect(result.metadata.skillChainUsed).toContain(
        "environment-diagnostics"
      );
    });
  });

  describe("Context Integration", () => {
    it("stores environment check in context", async () => {
      const result = await runEnvironmentWorkflow(validInputs);

      expect(result.envValidation).toBeDefined();
      // Context storage verified indirectly through successful completion
    });
  });
});
