// File: projects/cic/tests/mee/mee-self-evolution.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { MeePhaseGeneratorEngine } from "../../src/mee/mee-phase-generator-engine.js";
import { ResearchAgent } from "../../src/mee/research-agent.js";
import { FileMeePhaseSpecStore } from "../../src/mee/mee-phase-spec-store.js";
import { MeeArchitectureRefactorEngine } from "../../src/mee/mee-architecture-refactor-engine.js";
import { MeeCapabilityExpansionEngine } from "../../src/mee/mee-capability-expansion-engine.js";
import { MeeKnowledgeGraph } from "../../src/mee/mee-kg.js";
import { CkgStore } from "../../src/ckg/ckg-store.js";
import { MeeAgentOrchestrator } from "../../src/mee/mee-agent-orchestrator.js";
import { PlannerAgent } from "../../src/mee/planner-agent.js";
import { SafetyAgent } from "../../src/mee/safety-agent.js";
import { PlanningEngine } from "../../src/mee/planning/planning-engine.js";

describe("Mee Self-Evolution Subsystems (Phase 43, 44, 45)", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-evolution-tests");
  const tempGraphPath = path.join(tempDir, "graph.json");
  let ckg: CkgStore;
  let kg: MeeKnowledgeGraph;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    ckg = new CkgStore(tempGraphPath);
    kg = new MeeKnowledgeGraph(ckg);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Phase 43 — Autonomous Phase Generation (APG)", () => {
    it("should generate a valid Phase Spec from research findings", () => {
      const engine = new MeePhaseGeneratorEngine();
      const findings = [
        {
          id: "find-1",
          title: "Memory leak in task supervisor",
          description: "Task queues accumulate metadata without clean references.",
          evidence: ["run-1"],
          severity: "high" as const,
          category: "bug" as const,
          timestamp: Date.now()
        }
      ];

      const spec = engine.generatePhaseSpec(findings, 46);
      expect(spec.phaseNumber).toBe(46);
      expect(spec.title).toContain("Memory leak");
      expect(spec.findings.length).toBe(1);
      expect(spec.score).toBeGreaterThan(0);
    });

    it("should score phase specs correctly", () => {
      const engine = new MeePhaseGeneratorEngine();
      const spec = engine.generatePhaseSpec([], 43);
      
      const score = engine.scorePhaseSpec(spec);
      expect(score).toBe(spec.score);
    });

    it("should run multi-agent critique validation on spec", async () => {
      const engine = new MeePhaseGeneratorEngine();
      const spec = engine.generatePhaseSpec([], 43);

      const orchestrator = new MeeAgentOrchestrator(tempDir);
      orchestrator.registerAgent(new PlannerAgent("planner-1", "planner", new PlanningEngine()));
      orchestrator.registerAgent(new SafetyAgent("safety-1", "safety"));
      orchestrator.registerAgent(new ResearchAgent("research-1", "research"));

      const result = await engine.runValidationRound(spec, orchestrator, "job-1");
      expect(result.decision).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it("should persist phases to FileMeePhaseSpecStore", () => {
      const store = new FileMeePhaseSpecStore(tempDir);
      const spec = new MeePhaseGeneratorEngine().generatePhaseSpec([], 43);

      store.add(spec);
      const all = store.loadAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(spec.id);

      store.update(spec.id, { status: "approved" });
      const updated = store.get(spec.id);
      expect(updated?.status).toBe("approved");
    });
  });

  describe("Phase 44 — Autonomous Architecture Refactoring (AAR)", () => {
    it("should identify refactor opportunities in fragile modules", () => {
      // Record a failure node
      kg.recordProposalNode("prop-1", "Clean Proposal", "Summary", ["src/fragile.ts"]);
      kg.recordFailureNode("fail-1", "prop-1", "validation_failed", "Vitest failed");

      const engine = new MeeArchitectureRefactorEngine();
      const opportunities = engine.scan(kg);

      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities.some(o => o.file === "src/fragile.ts")).toBe(true);
    });

    it("should generate refactor proposals", () => {
      const engine = new MeeArchitectureRefactorEngine();
      const opp = {
        id: "opp-1",
        file: "src/fragile.ts",
        type: "complexity" as const,
        description: "High volatility",
        severity: "high" as const,
        suggestedAction: "Refactor nested ifs"
      };

      const proposal = engine.proposeRefactor(opp);
      expect(proposal.title).toContain("fragile.ts");
      expect(proposal.refactorPlan).toBeDefined();
      expect(proposal.refactorPlan?.patches.length).toBe(1);
    });

    it("should update architecture docs when refactor applied", async () => {
      const docPath = path.join(tempDir, "docs/cic/CIC_SYSTEM.md");
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, "# CIC System\n## 18. Self-Refactor & Evolution Log\n", "utf8");

      const engine = new MeeArchitectureRefactorEngine();
      const opp = {
        id: "opp-1",
        file: "src/fragile.ts",
        type: "complexity" as const,
        description: "High volatility",
        severity: "high" as const,
        suggestedAction: "Refactor nested ifs"
      };
      const proposal = engine.proposeRefactor(opp);

      await engine.applyRefactorPatch(proposal, tempDir);

      const content = fs.readFileSync(docPath, "utf8");
      expect(content).toContain("Refactor Log Entry");
      expect(content).toContain(proposal.id);
    });
  });

  describe("Phase 45 — Autonomous Capability Expansion (ACE)", () => {
    it("should detect capability gaps from CKG", () => {
      const engine = new MeeCapabilityExpansionEngine();
      const gaps = engine.detectGaps(kg);

      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0].title).toBeDefined();
    });

    it("should generate capability proposal with create patch", () => {
      const engine = new MeeCapabilityExpansionEngine();
      const spec = engine.detectGaps(kg)[0];

      const proposal = engine.generateProposal(spec);
      expect(proposal.title).toContain(spec.title);
      expect((proposal as any).patches.length).toBe(1);
      expect((proposal as any).patches[0].type).toBe("create");
    });

    it("should execute capability expansion on application", async () => {
      const docPath = path.join(tempDir, "docs/cic/CIC_SYSTEM.md");
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, "# CIC System\n## 19. Capability Expansion Registry\n", "utf8");

      const engine = new MeeCapabilityExpansionEngine();
      const spec = engine.detectGaps(kg)[0];

      await engine.applyExpansion(spec, kg, tempDir);

      // Verify file written
      const targetFile = path.join(tempDir, "projects/cic/src/mee/expanded-capabilities.ts");
      expect(fs.existsSync(targetFile)).toBe(true);

      // Verify node appended to CKG
      const nodes = ckg.load().nodes;
      expect(nodes.some(n => n.id === `capability:${spec.id}`)).toBe(true);

      // Verify doc updated
      const docContent = fs.readFileSync(docPath, "utf8");
      expect(docContent).toContain("Capability Integration");
      expect(docContent).toContain(spec.id);
    });
  });
});
