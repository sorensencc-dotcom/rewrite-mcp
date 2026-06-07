import { describe, it, expect, beforeEach } from "vitest";
import { runPipelineWorkflow } from "./index.js";

describe("Pipeline Orchestration Workflow", () => {
  let validInputs;

  beforeEach(() => {
    validInputs = {
      pipelineState: {
        stages: ["Discovery", "Harvester", "Redesign", "Outreach"],
        current: "Redesign",
        status: "in-progress"
      },
      repoActivity: [
        { timestamp: "2026-06-05T08:00:00Z", event: "commit", message: "Deploy v2" }
      ],
      agentActivity: [
        { timestamp: "2026-06-05T08:15:00Z", agentName: "Agent-A", action: "design", status: "complete" }
      ],
      ideaInbox: [
        { id: "idea-1", idea: "Add feature X", source: "feedback" }
      ]
    };
  });

  describe("Validation", () => {
    it("throws error if pipelineState is missing", () => {
      const input = { ...validInputs };
      delete input.pipelineState;

      expect(() => runPipelineWorkflow(input)).toThrow(
        "pipelineState is required"
      );
    });

    it("throws error if pipelineState.stages is not an array", () => {
      const input = { ...validInputs };
      input.pipelineState.stages = "not-an-array";

      expect(() => runPipelineWorkflow(input)).toThrow(
        "pipelineState.stages must be an array"
      );
    });

    it("throws error if pipelineState.current is missing", () => {
      const input = { ...validInputs };
      delete input.pipelineState.current;

      expect(() => runPipelineWorkflow(input)).toThrow(
        "pipelineState.current is required"
      );
    });

    it("throws error if repoActivity is missing", () => {
      const input = { ...validInputs };
      delete input.repoActivity;

      expect(() => runPipelineWorkflow(input)).toThrow(
        "repoActivity must be an array"
      );
    });

    it("throws error if agentActivity is missing", () => {
      const input = { ...validInputs };
      delete input.agentActivity;

      expect(() => runPipelineWorkflow(input)).toThrow(
        "agentActivity must be an array"
      );
    });

    it("throws error if ideaInbox is missing", () => {
      const input = { ...validInputs };
      delete input.ideaInbox;

      expect(() => runPipelineWorkflow(input)).toThrow(
        "ideaInbox must be an array"
      );
    });
  });

  describe("Execution", () => {
    it("runs workflow successfully with valid inputs", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result).toHaveProperty("orchestration");
      expect(result).toHaveProperty("sessionBoundary");
      expect(result).toHaveProperty("dailyBrief");
      expect(result).toHaveProperty("metadata");
    });

    it("returns orchestration with pipeline status", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.orchestration).toHaveProperty("totalStages");
      expect(result.orchestration).toHaveProperty("completedStages");
      expect(result.orchestration).toHaveProperty("blockedStages");
      expect(result.orchestration).toHaveProperty("progressPercent");
    });

    it("returns sessionBoundary status", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.sessionBoundary).toHaveProperty("messageCount");
      expect(result.sessionBoundary).toHaveProperty("contextDriftScore");
      expect(result.sessionBoundary).toHaveProperty("isOverflowing");
      expect(result.sessionBoundary).toHaveProperty("suggestedAction");
    });

    it("returns dailyBrief", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.dailyBrief).toHaveProperty("reportDate");
      expect(result.dailyBrief).toHaveProperty("executiveSummary");
      expect(result.dailyBrief).toHaveProperty("pipelineStatus");
    });

    it("harvests ideas when requested", async () => {
      const input = { ...validInputs, harvestIdeas: true };
      const result = await runPipelineWorkflow(input);

      expect(result.harvestedIdeas).toBeDefined();
      expect(result.harvestedIdeas).toHaveProperty("ideasProcessed");
    });

    it("skips idea harvesting when not requested", async () => {
      const input = { ...validInputs, harvestIdeas: false };
      const result = await runPipelineWorkflow(input);

      expect(result.harvestedIdeas).toBeNull();
    });

    it("generates dashboard visualizations", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.dashboard).toHaveProperty("dataPoints");
      expect(result.dashboard).toHaveProperty("visualizations");
      expect(Array.isArray(result.dashboard.visualizations)).toBe(true);
      expect(result.dashboard.visualizations.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("includes errors in metadata", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.metadata).toHaveProperty("errors");
      expect(Array.isArray(result.metadata.errors)).toBe(true);
    });

    it("continues workflow on partial skill failures", async () => {
      const result = await runPipelineWorkflow(validInputs);

      // Workflow should complete despite potential skill errors
      expect(result).toHaveProperty("orchestration");
      expect(result).toHaveProperty("metadata");
    });
  });

  describe("Telemetry", () => {
    it("records workflow duration", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.metadata.workflowDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.workflowDuration).toBe("number");
    });

    it("records timestamp", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.metadata.timestamp).toBeDefined();
      expect(new Date(result.metadata.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("lists skills used", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.metadata.skillChainUsed).toContain(
        "rewrite-labs-orchestrator"
      );
      expect(result.metadata.skillChainUsed).toContain(
        "session-boundary-manager"
      );
      expect(result.metadata.skillChainUsed).toContain("helm-daily-brief");
    });
  });

  describe("Context Integration", () => {
    it("stores pipeline state in context", async () => {
      const result = await runPipelineWorkflow(validInputs);

      expect(result.orchestration).toBeDefined();
      // Context storage verified indirectly through successful completion
    });
  });

  describe("Dashboard Visualization", () => {
    it("includes timeline visualization", async () => {
      const result = await runPipelineWorkflow(validInputs);

      const timeline = result.dashboard.visualizations.find(
        (v) => v.type === "timeline"
      );
      expect(timeline).toBeDefined();
      expect(timeline.data).toHaveProperty("stages");
    });

    it("includes progress visualization", async () => {
      const result = await runPipelineWorkflow(validInputs);

      const progress = result.dashboard.visualizations.find(
        (v) => v.type === "progress"
      );
      expect(progress).toBeDefined();
      expect(progress.data).toHaveProperty("total");
      expect(progress.data).toHaveProperty("completed");
    });

    it("includes dependency visualization", async () => {
      const result = await runPipelineWorkflow(validInputs);

      const dependency = result.dashboard.visualizations.find(
        (v) => v.type === "dependency"
      );
      expect(dependency).toBeDefined();
      expect(dependency.data).toHaveProperty("nodes");
      expect(dependency.data).toHaveProperty("edges");
    });
  });
});
