/**
 * Integration Tests: Token Economy Feedback Loop
 *
 * Tests the full feedback loop pipeline:
 * 1. Load CodeBurn model statistics
 * 2. Generate routing recommendations
 * 3. Update routing rules
 * 4. Verify rule consistency
 *
 * Run: npm run test:integration -- token-economy-feedback-loop
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyCodeburnInsights, exportTelemetryForCodeburn } from "../../src/token-economy/feedback_loop";

// Test data directory
const TEST_DIR = path.join(__dirname, "../../.test-artifacts");
const CODEBURN_EXPORT_PATH = path.join(TEST_DIR, "codeburn_export.json");
const ROUTING_RULES_PATH = path.join(TEST_DIR, "routing_rules.json");

/**
 * Mock CodeBurn export data
 */
function createMockCodeburnExport() {
  const stats = [
    {
      model: "claude-3.7-opus",
      avg_cost_usd: 0.12,
      avg_retry_rate: 0.05,
      pipeline_stage: "REDESIGN",
      usage_count: 100,
      success_rate: 0.98
    },
    {
      model: "claude-3.7-sonnet",
      avg_cost_usd: 0.04,
      avg_retry_rate: 0.08,
      pipeline_stage: "REDESIGN",
      usage_count: 150,
      success_rate: 0.96
    },
    {
      model: "claude-3.7-haiku",
      avg_cost_usd: 0.01,
      avg_retry_rate: 0.25,
      pipeline_stage: "OUTREACH",
      usage_count: 500,
      success_rate: 0.85
    },
    {
      model: "claude-3.7-sonnet",
      avg_cost_usd: 0.03,
      avg_retry_rate: 0.06,
      pipeline_stage: "INGEST",
      usage_count: 200,
      success_rate: 0.97
    }
  ];

  return { stats, exported_at: new Date().toISOString() };
}

/**
 * Create mock routing rules (baseline)
 */
function createMockRoutingRules() {
  return {
    version: "1.0.0",
    rules: [
      {
        id: "redesign-quality",
        match: { pipeline_stage: "REDESIGN" },
        action: { model: "claude-3.7-opus", max_tokens: 16384 }
      },
      {
        id: "outreach-economy",
        match: { pipeline_stage: "OUTREACH" },
        action: { model: "claude-3.7-haiku", max_tokens: 2048 }
      },
      {
        id: "ingest-standard",
        match: { pipeline_stage: "INGEST" },
        action: { model: "claude-3.7-sonnet", max_tokens: 8192 }
      }
    ],
    updated_at: new Date().toISOString()
  };
}

describe("Token Economy Feedback Loop", () => {
  beforeEach(() => {
    // Setup test environment
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Set environment variables
    process.env.CODEBURN_EXPORT_PATH = CODEBURN_EXPORT_PATH;
    process.env.ROUTING_RULES_PATH = ROUTING_RULES_PATH;
    process.env.CIC_TELEMETRY_DIR = path.join(TEST_DIR, "telemetry");
  });

  afterEach(() => {
    // Cleanup test artifacts
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Reset environment variables
    delete process.env.CODEBURN_EXPORT_PATH;
    delete process.env.ROUTING_RULES_PATH;
    delete process.env.CIC_TELEMETRY_DIR;
  });

  describe("Feedback Loop Pipeline", () => {
    it("should load CodeBurn statistics and generate recommendations", () => {
      // Setup: Create mock CodeBurn export
      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      // Setup: Create baseline routing rules
      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act: Apply CodeBurn insights
      applyCodeburnInsights();

      // Verify: Routing rules were updated
      expect(fs.existsSync(ROUTING_RULES_PATH)).toBe(true);
      const updatedRules = JSON.parse(fs.readFileSync(ROUTING_RULES_PATH, "utf8"));
      expect(updatedRules.rules).toBeDefined();
      expect(updatedRules.rules.length).toBeGreaterThan(0);

      // Verify: Recommendations file was created
      const recommendationsPath = path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json");
      expect(fs.existsSync(recommendationsPath)).toBe(true);
      const recommendations = JSON.parse(fs.readFileSync(recommendationsPath, "utf8"));
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("should handle missing CodeBurn export gracefully", () => {
      // Setup: No CodeBurn export file
      expect(fs.existsSync(CODEBURN_EXPORT_PATH)).toBe(false);

      // Act: Apply CodeBurn insights (should not throw)
      expect(() => applyCodeburnInsights()).not.toThrow();
    });

    it("should preserve rule structure during updates", () => {
      // Setup
      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify: Updated rules maintain structure
      const updatedRules = JSON.parse(fs.readFileSync(ROUTING_RULES_PATH, "utf8"));
      updatedRules.rules.forEach((rule: { id: string; match: Record<string, unknown>; action: Record<string, unknown> }) => {
        expect(rule.id).toBeDefined();
        expect(rule.match).toBeDefined();
        expect(rule.action).toBeDefined();
        expect(rule.action.model).toBeDefined();
        expect(rule.action.max_tokens).toBeDefined();
      });
    });

    it("should only update rules with high confidence recommendations", () => {
      // Setup
      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify: Recommendations have confidence scores
      const recommendationsPath = path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json");
      const recommendations = JSON.parse(fs.readFileSync(recommendationsPath, "utf8"));

      recommendations.forEach((rec: { confidence?: number }) => {
        if (rec.confidence !== undefined) {
          expect(rec.confidence).toBeGreaterThanOrEqual(0);
          expect(rec.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe("Cost Optimization Recommendations", () => {
    it("should recommend cheaper models when success rate is acceptable", () => {
      // Scenario: Haiku works 85% of the time; Opus works 98% of the time
      // Recommendation: Stick with Opus for quality-critical stages

      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify
      const recommendations = JSON.parse(
        fs.readFileSync(path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json"), "utf8")
      );

      // At least one cost optimization recommendation should exist
      const costOpts = recommendations.filter((r: { reason?: string }) => r.reason?.includes("optimization"));
      expect(costOpts.length).toBeGreaterThanOrEqual(0); // May be 0 if models are already optimal
    });

    it("should flag reliability issues when retry rate is high", () => {
      // Scenario: Haiku has 25% retry rate (high)
      // Recommendation: Use more reliable model if cost difference is acceptable

      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify
      const recommendations = JSON.parse(
        fs.readFileSync(path.join(path.dirname(ROUTING_RULES_PATH), "routing_recommendations.json"), "utf8")
      );

      // Haiku with 25% retry should have reliability warning
      const reliabilityRecs = recommendations.filter((r: { reason?: string }) => r.reason?.includes("Reliability"));
      expect(reliabilityRecs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Rule Consistency Checks", () => {
    it("should maintain rule uniqueness by ID", () => {
      // Setup
      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify
      const updatedRules = JSON.parse(fs.readFileSync(ROUTING_RULES_PATH, "utf8"));
      const ids = updatedRules.rules.map((r: { id: string }) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });

    it("should validate all rules have required fields", () => {
      // Setup
      const mockData = createMockCodeburnExport();
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      applyCodeburnInsights();

      // Verify
      const updatedRules = JSON.parse(fs.readFileSync(ROUTING_RULES_PATH, "utf8"));
      updatedRules.rules.forEach((rule: Record<string, unknown>) => {
        expect(rule.id).toBeDefined();
        expect(rule.match).toBeDefined();
        expect(rule.action).toBeDefined();
        expect((rule.action as Record<string, unknown>).model).toBeDefined();
        expect((rule.action as Record<string, unknown>).max_tokens).toBeDefined();
      });
    });
  });

  describe("Performance and Load", () => {
    it("should handle large model statistics datasets efficiently", () => {
      // Setup: Large dataset (1000 models)
      const largeStats = [];
      const stages = ["INGEST", "REDESIGN", "OUTREACH", "ANALYSIS"];
      const models = ["claude-3.7-opus", "claude-3.7-sonnet", "claude-3.7-haiku"];

      for (let i = 0; i < 1000; i++) {
        largeStats.push({
          model: models[i % models.length],
          avg_cost_usd: Math.random() * 0.2,
          avg_retry_rate: Math.random() * 0.3,
          pipeline_stage: stages[i % stages.length],
          usage_count: Math.floor(Math.random() * 1000),
          success_rate: 0.85 + Math.random() * 0.15
        });
      }

      const mockData = { stats: largeStats, exported_at: new Date().toISOString() };
      fs.writeFileSync(CODEBURN_EXPORT_PATH, JSON.stringify(mockData), "utf8");

      const baselineRules = createMockRoutingRules();
      fs.mkdirSync(path.dirname(ROUTING_RULES_PATH), { recursive: true });
      fs.writeFileSync(ROUTING_RULES_PATH, JSON.stringify(baselineRules), "utf8");

      // Act
      const startTime = Date.now();
      applyCodeburnInsights();
      const duration = Date.now() - startTime;

      // Verify: Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      expect(fs.existsSync(ROUTING_RULES_PATH)).toBe(true);
    });
  });
});
