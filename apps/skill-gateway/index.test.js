import { describe, it, expect } from "vitest";

describe("Skill Gateway API", () => {
  // Note: These are integration tests
  // Run with: npm test
  // Requires gateway to be running on http://localhost:3000

  const API = "http://localhost:3000/api";

  describe("Skills Endpoints", () => {
    it("lists all skills", async () => {
      const res = await fetch(`${API}/skills`);
      const data = await res.json();
      expect(data.total).toBe(13);
      expect(data.skills.length).toBe(13);
    });

    it("invokes a skill successfully", async () => {
      const res = await fetch(`${API}/skill/cic-section-summarizer/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: "§0.4",
          files: []
        })
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result).toHaveProperty("sectionId");
    });

    it("returns error for invalid skill", async () => {
      const res = await fetch(`${API}/skill/unknown-skill/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(500);
    });
  });

  describe("Workflow Endpoints", () => {
    it("lists all workflows", async () => {
      const res = await fetch(`${API}/workflows`);
      const data = await res.json();
      expect(data.total).toBe(3);
      expect(data.workflows.length).toBe(3);
    });

    it("executes phase-summary-roadmap workflow", async () => {
      const res = await fetch(`${API}/workflow/phase-summary-roadmap/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: "phase-44.0",
          sectionIds: ["§0.4"],
          roadmap: {},
          generateProcedure: false
        })
      });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("returns error for unknown workflow", async () => {
      const res = await fetch(`${API}/workflow/unknown-workflow/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Status Endpoints", () => {
    it("returns health status", async () => {
      const res = await fetch(`${API}/health`);
      const data = await res.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("components");
    });

    it("returns unified status snapshot", async () => {
      const res = await fetch(`${API}/status`);
      const data = await res.json();
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("phase");
      expect(data).toHaveProperty("environment");
      expect(data).toHaveProperty("pipeline");
      expect(data).toHaveProperty("health");
    });
  });

  describe("Telemetry Endpoints", () => {
    it("returns telemetry data", async () => {
      const res = await fetch(`${API}/telemetry`);
      const data = await res.json();
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("workflows");
      expect(data).toHaveProperty("alerts");
    });

    it("returns alerts", async () => {
      const res = await fetch(`${API}/alerts`);
      const data = await res.json();
      expect(data).toHaveProperty("total");
      expect(Array.isArray(data.alerts)).toBe(true);
    });
  });

  describe("Documentation", () => {
    it("returns API documentation", async () => {
      const res = await fetch(`${API}/docs`);
      const data = await res.json();
      expect(data).toHaveProperty("endpoints");
      expect(data.endpoints).toHaveProperty("skills");
      expect(data.endpoints).toHaveProperty("workflows");
    });

    it("returns root status", async () => {
      const res = await fetch("http://localhost:3000/");
      const data = await res.json();
      expect(data.status).toBe("running");
    });
  });
});
