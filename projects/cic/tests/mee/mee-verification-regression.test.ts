// File: projects/cic/tests/mee/mee-verification-regression.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isResearchFinding,
  isMeePhaseSpec,
  isMeeMetaRule,
  isRefactorInsight,
  ResearchFinding,
  MeePhaseSpec,
  MeeMetaRule,
  RefactorInsight
} from "../../src/mee/mee-schema.js";
import { FileMeeResearchFindingStore } from "../../src/mee/mee-research-finding-store.js";
import { FileMeePhaseSpecStore } from "../../src/mee/mee-phase-spec-store.js";
import { FileMeeMetaRuleStore } from "../../src/mee/mee-meta-rule-store.js";

describe("MEE Strict Schema Validation & Store Constraints", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mee-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Type Guards", () => {
    const validFinding: ResearchFinding = {
      id: "finding-1",
      title: "Test Finding",
      description: "Test finding description",
      evidence: ["evidence-1"],
      severity: "low",
      category: "opportunity",
      timestamp: Date.now(),
      status: "draft"
    };

    const validPhaseSpec: MeePhaseSpec = {
      id: "phase-spec-1",
      phaseNumber: 42,
      title: "Test Phase",
      purpose: "Test purpose",
      objectives: ["objective-1"],
      tasks: ["task-1"],
      requiredCapabilities: ["capability-1"],
      estimatedImpact: 80,
      feasibility: 90,
      risk: 10,
      alignment: 100,
      score: 85,
      status: "draft",
      findings: [validFinding],
      timestamp: Date.now()
    };

    const validMetaRule: MeeMetaRule = {
      id: "rule-1",
      name: "Test Heuristic",
      description: "Test description",
      heuristicType: "consensus_weight",
      weight: 0.75,
      conditions: ["condition-1"],
      action: "action-1",
      timestamp: Date.now()
    };

    const validRefactorInsight: RefactorInsight = {
      id: "insight-1",
      file: "test-file.ts",
      type: "complexity",
      message: "Complexity is too high",
      severity: "medium",
      location: {
        startLine: 10,
        endLine: 20
      }
    };

    it("should pass valid ResearchFinding objects", () => {
      expect(isResearchFinding(validFinding)).toBe(true);
    });

    it("should reject invalid ResearchFinding objects", () => {
      const invalid = { ...validFinding, severity: "invalid_severity" };
      expect(isResearchFinding(invalid)).toBe(false);
    });

    it("should pass valid MeePhaseSpec objects", () => {
      expect(isMeePhaseSpec(validPhaseSpec)).toBe(true);
    });

    it("should reject invalid MeePhaseSpec objects", () => {
      const invalid = { ...validPhaseSpec, phaseNumber: "not-a-number" };
      expect(isMeePhaseSpec(invalid)).toBe(false);
    });

    it("should pass valid MeeMetaRule objects", () => {
      expect(isMeeMetaRule(validMetaRule)).toBe(true);
    });

    it("should reject invalid MeeMetaRule objects", () => {
      const invalid = { ...validMetaRule, weight: 1.5 }; // weight must be between 0.0 and 1.0
      expect(isMeeMetaRule(invalid)).toBe(false);
    });

    it("should pass valid RefactorInsight objects", () => {
      expect(isRefactorInsight(validRefactorInsight)).toBe(true);
    });

    it("should reject invalid RefactorInsight objects", () => {
      const invalid = { ...validRefactorInsight, type: "invalid_type" };
      expect(isRefactorInsight(invalid)).toBe(false);
    });
  });

  describe("File Store Enforcements", () => {
    it("FileMeeResearchFindingStore should reject invalid finding on add", () => {
      const store = new FileMeeResearchFindingStore(tempDir);
      const invalidFinding: any = { id: "invalid-finding", severity: "critical" }; // missing required properties

      expect(() => store.add(invalidFinding)).toThrow("Invalid ResearchFinding schema");
    });

    it("FileMeePhaseSpecStore should reject invalid phase on add", () => {
      const store = new FileMeePhaseSpecStore(tempDir);
      const invalidPhase: any = { id: "invalid-phase", status: "draft" }; // missing required properties

      expect(() => store.add(invalidPhase)).toThrow("Invalid MeePhaseSpec schema");
    });

    it("FileMeeMetaRuleStore should reject invalid meta rule on add", () => {
      const store = new FileMeeMetaRuleStore(tempDir);
      const invalidRule: any = { id: "invalid-rule", weight: 2.0 }; // weight exceeds bounds

      expect(() => store.add(invalidRule)).toThrow("Invalid MeeMetaRule schema");
    });
  });
});
