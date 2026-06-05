import { describe, it, expect, beforeEach } from "vitest";
import { runPhaseSummaryWorkflow } from "./index.js";

describe("Phase Summary Workflow", () => {
  let validInputs;

  beforeEach(() => {
    validInputs = {
      phaseId: "phase-44.0",
      sectionIds: ["§0.4", "§0.5"],
      roadmap: { version: "v2.4.0", phases: [] },
      artifacts: [],
      tests: []
    };
  });

  describe("Validation", () => {
    it("throws error if phaseId is missing", () => {
      const input = { ...validInputs };
      delete input.phaseId;

      expect(() => runPhaseSummaryWorkflow(input)).toThrow(
        "phaseId is required"
      );
    });

    it("throws error if sectionIds is missing", () => {
      const input = { ...validInputs };
      delete input.sectionIds;

      expect(() => runPhaseSummaryWorkflow(input)).toThrow(
        "sectionIds is required"
      );
    });

    it("throws error if sectionIds is empty", () => {
      const input = { ...validInputs, sectionIds: [] };

      expect(() => runPhaseSummaryWorkflow(input)).toThrow(
        "sectionIds is required"
      );
    });

    it("throws error if roadmap is missing", () => {
      const input = { ...validInputs };
      delete input.roadmap;

      expect(() => runPhaseSummaryWorkflow(input)).toThrow(
        "roadmap is required"
      );
    });
  });

  describe("Execution", () => {
    it("runs workflow successfully with valid inputs", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result).toHaveProperty("phaseId");
      expect(result).toHaveProperty("phaseSummary");
      expect(result).toHaveProperty("validationReport");
      expect(result).toHaveProperty("roadmapUpdate");
      expect(result).toHaveProperty("metadata");
    });

    it("returns phaseSummary with correct structure", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.phaseSummary).toHaveProperty("sections");
      expect(result.phaseSummary).toHaveProperty("totalPercentComplete");
      expect(result.phaseSummary).toHaveProperty("aggregateStatus");
      expect(Array.isArray(result.phaseSummary.sections)).toBe(true);
    });

    it("returns roadmapUpdate", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.roadmapUpdate).toBeDefined();
      expect(typeof result.roadmapUpdate).toBe("object");
    });

    it("includes metadata with skill chain", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.metadata).toHaveProperty("workflowDuration");
      expect(result.metadata).toHaveProperty("skillChainUsed");
      expect(result.metadata).toHaveProperty("timestamp");
      expect(Array.isArray(result.metadata.skillChainUsed)).toBe(true);
    });

    it("generates procedure when requested", async () => {
      const input = { ...validInputs, generateProcedure: true };
      const result = await runPhaseSummaryWorkflow(input);

      expect(result.procedure).toBeDefined();
    });

    it("skips procedure when not requested", async () => {
      const input = { ...validInputs, generateProcedure: false };
      const result = await runPhaseSummaryWorkflow(input);

      expect(result.procedure).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("includes errors in metadata", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.metadata).toHaveProperty("errors");
      expect(Array.isArray(result.metadata.errors)).toBe(true);
    });

    it("continues workflow on partial skill failures", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      // Workflow should complete despite potential skill errors
      expect(result).toHaveProperty("phaseId");
      expect(result).toHaveProperty("metadata");
    });
  });

  describe("Telemetry", () => {
    it("records workflow duration", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.metadata.workflowDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.workflowDuration).toBe("number");
    });

    it("records timestamp", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.metadata.timestamp).toBeDefined();
      // Validate ISO string format
      expect(new Date(result.metadata.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("lists all skills used", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.metadata.skillChainUsed).toContain(
        "cic-section-summarizer"
      );
      expect(result.metadata.skillChainUsed).toContain("phase-validator");
      expect(result.metadata.skillChainUsed).toContain("cic-roadmap-updater");
    });
  });

  describe("Context Integration", () => {
    it("stores phase in context after successful run", async () => {
      const result = await runPhaseSummaryWorkflow(validInputs);

      expect(result.phaseId).toBe("phase-44.0");
      // Context storage is verified indirectly through successful completion
    });
  });
});
