// File: projects/cic/tests/mee/mee-kg.test.ts | Date: 2026-06-04 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { CkgStore } from "../../src/ckg/ckg-store.js";
import { MeeKnowledgeGraph } from "../../src/mee/mee-kg.js";

describe("MeeKnowledgeGraph Subsystem", () => {
  const tempDir = path.resolve(process.cwd(), "projects/cic/tests/mee/temp-kg-tests");
  const graphPath = path.join(tempDir, "graph.json");
  let store: CkgStore;
  let kg: MeeKnowledgeGraph;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    store = new CkgStore(graphPath);
    kg = new MeeKnowledgeGraph(store);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should record task nodes and dependency edges correctly", () => {
    kg.recordTaskNode("task-1", "Refactor Server", "refactor", []);
    kg.recordTaskNode("task-2", "Add Sandbox Checks", "feature", ["task-1"]);

    const graph = kg.getGraph();
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0]).toEqual({
      from: "task-2",
      to: "task-1",
      type: "depends_on"
    });
  });

  it("should record proposals, critiques, and extract fragile modules & safety risks", () => {
    // 1. Record proposal with refined file
    kg.recordProposalNode("prop-1", "Upgrade Ingest Layer", "Refining ingest parser logic", ["src/ingest.ts"]);

    // 2. Record agent critiques
    kg.recordCritiqueEdge("prop-1", {
      id: "c-1",
      agentId: "agent-safety-1",
      targetAgentId: "agent-planner",
      issue: "Found forbidden eval pattern",
      severity: "error",
      suggestedFix: "Remove eval usage",
      timestamp: new Date().toISOString()
    });

    // 3. Record sandbox failure
    kg.recordFailureNode("fail-1", "prop-1", "sandbox_compile_error", "Compilation failed in ingest.ts");

    const graph = kg.getGraph();
    expect(graph.nodes.some(n => n.type === "failure")).toBe(true);
    expect(graph.edges.some(e => e.type === "caused_failure")).toBe(true);
    expect(graph.edges.some(e => e.type === "critique_by")).toBe(true);

    // 4. Query semantic insights
    const fragile = kg.getFragileModules();
    expect(fragile.length).toBe(1);
    expect(fragile[0].path).toBe("src/ingest.ts");
    expect(fragile[0].failureCount).toBe(1);

    const risks = kg.getSafetyRisks();
    expect(risks.length).toBe(1);
    expect(risks[0]).toBe("Found forbidden eval pattern");
  });
});
