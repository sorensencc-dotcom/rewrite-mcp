import { describe, it, expect, beforeEach } from "vitest";
import { SkillMcpServer } from "./mcp-server.js";

describe("SkillMcpServer", () => {
  let server;

  beforeEach(() => {
    server = new SkillMcpServer();
  });

  describe("Tool Management", () => {
    it("lists all 13 tools", () => {
      const tools = server.getTools();
      expect(tools).toHaveLength(13);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
      expect(tools[0]).toHaveProperty("inputSchema");
    });

    it("maps tool names to skill names correctly", () => {
      const skillName = server.getSkillName("summarize_cic_phase");
      expect(skillName).toBe("cic-section-summarizer");
    });

    it("throws error for unknown tool", () => {
      expect(() => server.getSkillName("unknown-tool")).toThrow(
        "Unknown tool"
      );
    });

    it("exports valid MCP config", () => {
      const config = server.exportConfig();
      expect(config.name).toBe("skill-runtime");
      expect(config.version).toBe("1.0.0");
      expect(config.tools).toHaveLength(13);
    });
  });

  describe("Tool Execution", () => {
    it("executes cic-section-summarizer tool", async () => {
      const result = await server.executeTool("summarize_cic_phase", {
        sectionId: "phase-44.0"
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty("sectionId");
    });

    it("executes agent-drift-detector tool", async () => {
      const result = await server.executeTool("detect_agent_drift", {
        agentName: "test-agent",
        expectedSchema: { a: 1 },
        actualSchema: { a: 1, b: 2 }
      });

      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty("driftDetected");
    });

    it("handles validation errors gracefully", async () => {
      const result = await server.executeTool("summarize_cic_phase", {
        // Missing required sectionId
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe(true);
      expect(parsed.type).toMatch(/Error/);
    });

    it("includes duration in error responses", async () => {
      const result = await server.executeTool("summarize_cic_phase", {});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty("durationMs");
      expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Dependency Management", () => {
    it("validates skill dependencies", () => {
      const validation = server.validateSkill("cic-roadmap-updater");
      expect(validation.isValid).toBe(true);
      expect(validation.dependencies).toContain("cic-section-summarizer");
    });

    it("checks for circular dependencies", () => {
      const check = server.checkDependencies();
      expect(check.hasCycles).toBe(false);
    });
  });

  describe("Telemetry", () => {
    it("retrieves skill metrics after execution", async () => {
      await server.executeTool("summarize_cic_phase", {
        sectionId: "phase-44.0"
      });

      const metrics = server.getSkillMetrics("cic-section-summarizer");
      expect(metrics).toBeDefined();
      expect(metrics.totalInvocations).toBeGreaterThan(0);
    });

    it("provides all metrics aggregated", () => {
      const allMetrics = server.getAllMetrics();
      expect(allMetrics).toHaveProperty("summary");
      expect(allMetrics).toHaveProperty("metrics");
    });
  });

  describe("Error Formatting", () => {
    it("formats ValidationError correctly", async () => {
      const result = await server.executeTool("detect_agent_drift", {
        // Missing required fields
      });

      const error = JSON.parse(result.content[0].text);
      expect(error.type).toMatch(/Error/);
      expect(error.tool).toBe("detect_agent_drift");
      expect(error.timestamp).toBeDefined();
      expect(error.durationMs).toBeDefined();
    });

    it("includes all error fields", async () => {
      const result = await server.executeTool("orchestrate_rl_pipeline", {});

      const error = JSON.parse(result.content[0].text);
      expect(error).toHaveProperty("error");
      expect(error).toHaveProperty("tool");
      expect(error).toHaveProperty("durationMs");
      expect(error).toHaveProperty("timestamp");
      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("message");
    });
  });
});
