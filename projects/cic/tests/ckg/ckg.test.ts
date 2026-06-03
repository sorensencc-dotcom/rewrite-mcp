// File: projects/cic/tests/ckg/ckg.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CkgStore } from "../../src/ckg/ckg-store.js";
import { CkgHarvester } from "../../src/ckg/ckg-harvester.js";
import { CkgSynthesizer } from "../../src/ckg/ckg-synthesizer.js";
import { registerCkgRoutes } from "../../src/cic/control-plane/ckg-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 27 — CKG Knowledge Graph", () => {
  const tempGraphPath = path.resolve(__dirname, "../../ckg/temp-test-graph.json");
  const tempWorkspaceRoot = path.resolve(__dirname, "../../temp-test-workspace");

  beforeEach(() => {
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
    if (fs.existsSync(tempWorkspaceRoot)) {
      fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(tempWorkspaceRoot, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
    if (fs.existsSync(tempWorkspaceRoot)) {
      fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    }
  });

  it("loads, saves, appends nodes and edges in CkgStore", () => {
    const store = new CkgStore(tempGraphPath);
    
    // Initial load should be empty
    const emptyGraph = store.load();
    expect(emptyGraph.nodes).toEqual([]);
    expect(emptyGraph.edges).toEqual([]);

    // Append Node
    store.appendNode({
      id: "test:n1",
      type: "skill",
      name: "Test Skill 1",
      tags: ["tag1"]
    });

    let graph = store.load();
    expect(graph.nodes.length).toBe(1);
    expect(graph.nodes[0].id).toBe("test:n1");

    // Append duplicate/update Node
    store.appendNode({
      id: "test:n1",
      type: "skill",
      name: "Test Skill 1 Updated",
      tags: ["tag2"]
    });

    graph = store.load();
    expect(graph.nodes.length).toBe(1);
    expect(graph.nodes[0].name).toBe("Test Skill 1 Updated");
    expect(graph.nodes[0].tags).toContain("tag1");
    expect(graph.nodes[0].tags).toContain("tag2");

    // Append Edge
    store.appendEdge({
      from: "test:n1",
      to: "test:n2",
      type: "depends_on"
    });

    graph = store.load();
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].from).toBe("test:n1");
    expect(graph.edges[0].to).toBe("test:n2");
  });

  it("calculates neighborhood correctly", () => {
    const store = new CkgStore(tempGraphPath);
    store.appendNode({ id: "n1", type: "skill", name: "N1" });
    store.appendNode({ id: "n2", type: "skill", name: "N2" });
    store.appendNode({ id: "n3", type: "skill", name: "N3" });
    store.appendNode({ id: "n4", type: "skill", name: "N4" });

    store.appendEdge({ from: "n1", to: "n2", type: "rel" });
    store.appendEdge({ from: "n2", to: "n3", type: "rel" });
    // Out of depth bound (depth 3)
    store.appendEdge({ from: "n3", to: "n4", type: "rel" });

    const neighborhood = store.getNeighborhood("n1", 2);
    expect(neighborhood.nodes.some(n => n.id === "n1")).toBe(true);
    expect(neighborhood.nodes.some(n => n.id === "n2")).toBe(true);
    expect(neighborhood.nodes.some(n => n.id === "n3")).toBe(true);
    expect(neighborhood.nodes.some(n => n.id === "n4")).toBe(false); // depth 3

    expect(neighborhood.edges.length).toBe(2);
  });

  it("harvester correctly extracts files across systems", () => {
    // Setup mock workspace files
    const docsDir = path.resolve(tempWorkspaceRoot, "docs/cic");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.resolve(docsDir, "CIC_TEST_DOC.md"), "# Test Doc");

    const memoryDir = path.resolve(tempWorkspaceRoot, "projects/cic/data");
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(memoryDir, "memory-ledger.jsonl"),
      JSON.stringify({ id: "evt1", type: "pipeline.run", timestamp: new Date().toISOString(), payload: {} }) + "\n"
    );

    const skillDir = path.resolve(tempWorkspaceRoot, "projects/cic/skill-graph");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(skillDir, "graph.json"),
      JSON.stringify({
        nodes: [{ id: "skill:test", type: "skill", name: "Test Skill" }],
        edges: [{ from: "agent:charlie", to: "skill:test", type: "implements" }]
      })
    );

    const aprDir = path.resolve(tempWorkspaceRoot, "projects/cic/.apr");
    fs.mkdirSync(aprDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(aprDir, "episodes.jsonl"),
      JSON.stringify({
        id: "ep1",
        status: "complete",
        timestamp: new Date().toISOString(),
        decision: {
          plan: {
            goals: [{ id: "g1", title: "Goal 1", priority: "high", description: "First Goal" }]
          }
        }
      }) + "\n"
    );

    const croDir = path.resolve(tempWorkspaceRoot, "projects/cic/.cro");
    fs.mkdirSync(croDir, { recursive: true });
    fs.writeFileSync(
      path.resolve(croDir, "executions.jsonl"),
      JSON.stringify({
        id: "ex1",
        status: "success",
        timestamp: new Date().toISOString(),
        tasks: [{ taskId: "t1", title: "Task 1", status: "complete", owner: "agent:charlie", retryCount: 0 }]
      }) + "\n"
    );

    const store = new CkgStore(tempGraphPath);
    const harvester = new CkgHarvester(tempWorkspaceRoot, store);
    harvester.run();

    const graph = store.load();
    
    // Validate doc node
    expect(graph.nodes.some(n => n.id === "doc:cic_test_doc.md")).toBe(true);

    // Validate memory node
    expect(graph.nodes.some(n => n.id === "memory:evt1")).toBe(true);

    // Validate skill node and edge
    expect(graph.nodes.some(n => n.id === "skill:test")).toBe(true);
    expect(graph.edges.some(e => e.from === "agent:charlie" && e.to === "skill:test")).toBe(true);

    // Validate APR node
    expect(graph.nodes.some(n => n.id === "apr:ep1")).toBe(true);
    expect(graph.nodes.some(n => n.id === "goal:g1")).toBe(true);

    // Validate CRO node
    expect(graph.nodes.some(n => n.id === "cro:ex1")).toBe(true);
    expect(graph.nodes.some(n => n.id === "execution_task:t1")).toBe(true);
  });

  it("synthesizer deduplicates nodes/edges and identifies hotspots & drift", () => {
    const store = new CkgStore(tempGraphPath);
    
    // Nodes
    store.appendNode({ id: "hub", type: "concept", name: "Central Hub" });
    for (let i = 1; i <= 6; i++) {
      store.appendNode({ id: `leaf:${i}`, type: "concept", name: `Leaf ${i}` });
      store.appendEdge({ from: "hub", to: `leaf:${i}`, type: "connects" });
    }
    // Orphan skill node
    store.appendNode({ id: "skill:orphan", type: "skill", name: "Orphan Skill" });
    // Normal skill node with dependency (should not be unmapped)
    store.appendNode({ id: "skill:mapped", type: "skill", name: "Mapped Skill" });
    store.appendEdge({ from: "agent:charlie", to: "skill:mapped", type: "implements" });

    // Failed task discrepancy
    store.appendNode({ id: "task:failed", type: "task", name: "Failed Task", tags: ["failed"] });

    const synthesizer = new CkgSynthesizer(store);
    synthesizer.run();

    const graph = store.load();
    expect(graph.meta?.hotspots?.centralNodes.some(n => n.id === "hub")).toBe(true);
    expect(graph.meta?.hotspots?.orphans.some(n => n.id === "skill:orphan")).toBe(true);
    
    // Check drift report
    expect(graph.meta?.drift?.unmappedSkills.some(us => us.id === "skill:orphan")).toBe(true);
    expect(graph.meta?.drift?.unmappedSkills.some(us => us.id === "skill:mapped")).toBe(false);
    expect(graph.meta?.drift?.stateDiscrepancies.some(sd => sd.nodeId === "task:failed")).toBe(true);
  });

  it("registers Express REST routes", () => {
    const mockRouter = {
      get: [] as { path: string; handler: any }[],
      post: [] as { path: string; handler: any }[],
    };

    const routerProxy = {
      get(path: string, handler: any) {
        mockRouter.get.push({ path, handler });
      },
      post(path: string, handler: any) {
        mockRouter.post.push({ path, handler });
      }
    };

    registerCkgRoutes(routerProxy);

    expect(mockRouter.get.some(r => r.path === "/ckg/graph")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/ckg/nodes")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/ckg/edges")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/ckg/neighborhood/:id")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/ckg/hotspots")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/ckg/drift")).toBe(true);
    expect(mockRouter.post.some(r => r.path === "/ckg/harvest")).toBe(true);
  });
});
