// File: projects/cic/tests/skills/skills.test.ts | Date: 2026-06-03 | v1.0.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SkillGraphStore, SkillNode, SkillEdge, SkillGraph } from "../../src/skills/skill-graph-store.js";
import { SkillHarvester } from "../../src/skills/skill-harvester.js";
import { SkillSynthesizer } from "../../src/skills/skill-synthesizer.js";
import { SkillDoctrineSync } from "../../src/skills/skill-doctrine-sync.js";
import { registerSkillsRoutes } from "../../src/cic/control-plane/skills-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 24 — Skill Graph & Cross-System Doctrine (SGD)", () => {
  const tempGraphPath = path.resolve(__dirname, "../../skill-graph/temp-test-graph.json");

  beforeEach(() => {
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempGraphPath)) {
      fs.unlinkSync(tempGraphPath);
    }
  });

  it("SkillGraphStore loads, saves, and updates the graph", () => {
    const store = new SkillGraphStore(tempGraphPath);

    // Initial load returns empty structures
    const initial = store.load();
    expect(initial.nodes).toEqual([]);
    expect(initial.edges).toEqual([]);

    const sampleGraph: SkillGraph = {
      nodes: [
        { id: "agent:arps", type: "agent", name: "arps-agent.ts" },
        { id: "skill:arps", type: "skill", name: "arps-rules" }
      ],
      edges: [
        { from: "agent:arps", to: "skill:arps", type: "implements" }
      ]
    };

    store.save(sampleGraph);

    const loaded = store.load();
    expect(loaded.nodes.length).toBe(2);
    expect(loaded.edges.length).toBe(1);

    // Update mutates correctly
    store.update(g => ({
      ...g,
      nodes: [...g.nodes, { id: "tool:git", type: "tool", name: "Git CLI" }]
    }));

    const updated = store.load();
    expect(updated.nodes.length).toBe(3);
    expect(updated.nodes.find(n => n.id === "tool:git")).toBeDefined();
  });

  it("SkillHarvester registers agents, prompts, and builds links", () => {
    const store = new SkillGraphStore(tempGraphPath);
    const repoRoot = path.resolve(__dirname, "../../../..");
    const harvester = new SkillHarvester(repoRoot, store);

    harvester.run();

    const graph = store.load();
    expect(graph.nodes.length).toBeGreaterThan(0);
    
    // Ensure agent, skill, and external system nodes exist
    expect(graph.nodes.some(n => n.type === "agent")).toBe(true);
    expect(graph.nodes.some(n => n.type === "skill")).toBe(true);
    expect(graph.nodes.some(n => n.type === "external_system")).toBe(true);
  });

  it("SkillSynthesizer dedupes and identifies hotspots (orphans/dense nodes)", () => {
    const store = new SkillGraphStore(tempGraphPath);
    const synth = new SkillSynthesizer(store);

    const duplicateGraph: SkillGraph = {
      nodes: [
        { id: "agent:test", type: "agent", name: "test.ts" },
        { id: "agent:test", type: "agent", name: "test.ts" }, // Duplicate node
        { id: "skill:orphan", type: "skill", name: "orphan.yaml" },
        { id: "skill:dense", type: "skill", name: "dense.yaml" }
      ],
      edges: [
        { from: "agent:test", to: "skill:dense", type: "implements" },
        { from: "agent:test", to: "skill:dense", type: "implements" } // Duplicate edge
      ]
    };

    // Add extra edges to make a dense node (degree >= 5)
    for (let i = 0; i < 5; i++) {
      duplicateGraph.nodes.push({ id: `agent:mock-${i}`, type: "agent", name: `mock-${i}.ts` });
      duplicateGraph.edges.push({ from: `agent:mock-${i}`, to: "skill:dense", type: "implements" });
    }

    store.save(duplicateGraph);
    synth.run();

    const result = store.load();
    // Deduped nodes (test, orphan, dense + 5 mock agents = 8 nodes)
    expect(result.nodes.length).toBe(8);

    // Deduped edges (1 implements + 5 mock implements = 6 edges)
    expect(result.edges.length).toBe(6);

    const hotspots = result.meta?.hotspots as any;
    expect(hotspots).toBeDefined();
    
    // Orphan detection
    expect(hotspots.orphanSkills.length).toBe(1);
    expect(hotspots.orphanSkills[0].id).toBe("skill:orphan");

    // Dense node detection
    expect(hotspots.denseNodes.length).toBe(1);
    expect(hotspots.denseNodes[0].id).toBe("skill:dense");
  });

  it("SkillDoctrineSync detects unmapped internal skills", () => {
    const store = new SkillGraphStore(tempGraphPath);
    
    const sampleGraph: SkillGraph = {
      nodes: [
        { id: "skill:mapped", type: "skill", name: "mapped.yaml" },
        { id: "skill:unmapped", type: "skill", name: "unmapped.yaml" }
      ],
      edges: []
    };
    store.save(sampleGraph);

    const sync = new SkillDoctrineSync(store, [
      { cicSkillId: "skill:mapped", claudeSkillId: "c-1" }
    ]);

    const report = sync.computeDrift();
    expect(report.unmappedCicSkills.length).toBe(1);
    expect(report.unmappedCicSkills[0].id).toBe("skill:unmapped");
  });

  it("registerSkillsRoutes sets up router paths", () => {
    const registeredGets = new Map<string, Function>();
    const registeredPosts = new Map<string, Function>();
    
    const mockRouter = {
      get(path: string, handler: Function) {
        registeredGets.set(path, handler);
      },
      post(path: string, handler: Function) {
        registeredPosts.set(path, handler);
      }
    };

    registerSkillsRoutes(mockRouter as any);

    expect(registeredGets.has("/skills/graph")).toBe(true);
    expect(registeredGets.has("/skills/nodes")).toBe(true);
    expect(registeredGets.has("/skills/edges")).toBe(true);
    expect(registeredGets.has("/skills/hotspots")).toBe(true);
    expect(registeredGets.has("/skills/drift")).toBe(true);
    expect(registeredPosts.has("/skills/harvest")).toBe(true);
  });
});
