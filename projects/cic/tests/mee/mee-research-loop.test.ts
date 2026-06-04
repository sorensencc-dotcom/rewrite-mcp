// File: projects/cic/tests/mee/mee-research-loop.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { FileMeeResearchFindingStore } from "../../src/mee/mee-research-finding-store.js";
import { FileMeeMetaRuleStore } from "../../src/mee/mee-meta-rule-store.js";
import { MeeResearchEngine } from "../../src/mee/mee-research-engine.js";
import { FileMeeRunStore } from "../../src/mee/mee-run-store.js";
import { FileMeeRunFailureContextStore } from "../../src/mee/mee-autonomous-store.js";
import { MeeKnowledgeGraph } from "../../src/mee/mee-kg.js";
import { CkgStore } from "../../src/ckg/ckg-store.js";
import { MeePhaseGeneratorEngine } from "../../src/mee/mee-phase-generator-engine.js";
import { FileMeePhaseSpecStore } from "../../src/mee/mee-phase-spec-store.js";

describe("Phase 42 — Autonomous Research Loop & Mode", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-research-tests");
  const tempGraphPath = path.join(tempDir, "graph.json");
  let ckg: CkgStore;
  let kg: MeeKnowledgeGraph;
  let findingsStore: FileMeeResearchFindingStore;
  let metaRulesStore: FileMeeMetaRuleStore;
  let runStore: FileMeeRunStore;
  let failureStore: FileMeeRunFailureContextStore;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
    fs.mkdirSync(tempDir, { recursive: true });

    ckg = new CkgStore(tempGraphPath);
    kg = new MeeKnowledgeGraph(ckg);
    findingsStore = new FileMeeResearchFindingStore(tempDir);
    metaRulesStore = new FileMeeMetaRuleStore(tempDir);
    findingsStore.saveAll([]);
    metaRulesStore.saveAll([]);
    runStore = new FileMeeRunStore(path.join(tempDir, "runs"));
    failureStore = new FileMeeRunFailureContextStore(path.join(tempDir, "failures"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should persist findings to FileMeeResearchFindingStore", () => {
    const finding = {
      id: "find-1",
      title: "Complexity hotspot in engine",
      description: "nested conditions detected",
      evidence: [],
      severity: "medium" as const,
      category: "opportunity" as const,
      status: "draft" as const,
      timestamp: Date.now()
    };

    findingsStore.add(finding);
    const all = findingsStore.loadAll();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe("find-1");

    findingsStore.update("find-1", { status: "approved" });
    const updated = findingsStore.get("find-1");
    expect(updated?.status).toBe("approved");
  });

  it("should persist meta-rules to FileMeeMetaRuleStore", () => {
    const rule = {
      id: "rule-1",
      name: "Throttle concurrency limit",
      description: "reduce concurrency on failures",
      heuristicType: "scheduler_concurrency" as const,
      weight: 0.9,
      conditions: ["run_failure"],
      action: "reduce_limit_to_1",
      timestamp: Date.now()
    };

    metaRulesStore.add(rule);
    const all = metaRulesStore.loadAll();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe("rule-1");
  });

  it("should execute manual research scan and generate discoveries", async () => {
    // Record a failure node and a run context
    kg.recordProposalNode("prop-1", "Failing Proposal", "Summary", ["src/main.ts"]);
    kg.recordFailureNode("fail-1", "prop-1", "Vitest timeout", "Execution failed");
    
    // Add run history and failure context
    runStore.saveRun({
      id: "run-fail",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "failed",
      proposalIds: ["prop-1"],
      currentStepIndex: 0,
      totalSteps: 2
    });

    failureStore.save({
      runId: "run-fail",
      createdAt: new Date().toISOString(),
      failingProposalIds: ["prop-1"],
      errorMessage: "Vitest timeout",
      errorCode: "vitest.timeout"
    });

    const engine = new MeeResearchEngine(findingsStore, metaRulesStore, runStore, failureStore);
    const result = await engine.runResearchScan(kg);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.rules.length).toBeGreaterThan(0);

    const savedFindings = findingsStore.loadAll();
    expect(savedFindings.length).toBe(result.findings.length);
    expect(savedFindings[0].severity).toBe("high");
    expect(savedFindings[0].category).toBe("bug");
    expect(savedFindings[0].evidence).toContain("run-fail");

    const savedRules = metaRulesStore.loadAll();
    expect(savedRules[0].heuristicType).toBe("scheduler_concurrency");
  });

  it("should approve finding and generate draft phase spec", () => {
    const finding = {
      id: "find-2",
      title: "Verification Finding",
      description: "Test density optimizations",
      evidence: [],
      severity: "low" as const,
      category: "opportunity" as const,
      status: "draft" as const,
      timestamp: Date.now()
    };

    findingsStore.add(finding);
    const specStore = new FileMeePhaseSpecStore(tempDir);
    const generator = new MeePhaseGeneratorEngine();

    const spec = generator.generatePhaseSpec([finding], 46);
    specStore.add(spec);

    expect(spec.phaseNumber).toBe(46);
    expect(spec.findings[0].id).toBe("find-2");
    expect(specStore.loadAll().length).toBe(1);
  });
});
