// File: projects/cic/tests/mee/mee.test.ts | Date: 2026-06-03 | v1.2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MeeTriggerEngine } from "../../src/mee/mee-trigger.js";
import { MeePhaseGenerator } from "../../src/mee/mee-generator.js";
import { MeePatchSynthesizer } from "../../src/mee/mee-synthesizer.js";
import { MeeValidator } from "../../src/mee/mee-validator.js";
import { AutoEvolutionEngine } from "../../src/mee/auto-evolution-engine.js";
import { MeeProposalStore } from "../../src/mee/mee-proposal-store.js";
import { registerMeeRoutes } from "../../src/cic/control-plane/mee-routes.js";
import { CkgStore } from "../../src/ckg/ckg-store.js";
import { PhasePatchSet } from "../../src/mee/mee-schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Phase 30 — MEE Meta‑Evolution Engine", () => {
  const tempGraphPath = path.resolve(__dirname, "../../ckg/mee-test-graph.json");

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

  it("detects gaps and drift in MeeTriggerEngine", () => {
    const store = new CkgStore(tempGraphPath);
    // Write a graph with an orphan skill node and a drift discrepancy
    store.save({
      nodes: [
        { id: "skill:orphan", type: "skill", name: "Orphan Skill" },
        { id: "task:failed", type: "task", name: "Failed Task" }
      ],
      edges: [],
      meta: {
        hotspots: {
          centralNodes: [],
          orphans: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }]
        },
        drift: {
          unmappedSkills: [{ id: "skill:orphan", issue: "Unmapped skill" }],
          stateDiscrepancies: [{ nodeId: "task:failed", issue: "State discrepancy" }]
        }
      }
    });

    const triggerEngine = new MeeTriggerEngine(store);
    const events = triggerEngine.detectTriggers();

    expect(events.length).toBe(3);
    expect(events.some(e => e.type === "capability_gap")).toBe(true);
    expect(events.some(e => e.type === "drift")).toBe(true);
  });

  it("serializes and deserializes trigger events in MeeTriggerEngine", () => {
    const store = new CkgStore(tempGraphPath);
    const triggerEngine = new MeeTriggerEngine(store);
    const event = {
      id: "evt-uuid",
      type: "drift",
      payload: { value: 123 },
      timestamp: 1000
    };
    const serialized = triggerEngine.serialize(event);
    expect(serialized).toEqual(event);

    const deserialized = triggerEngine.deserialize(serialized);
    expect(deserialized).toEqual(event);
  });

  it("generates a phase plan from trigger event", () => {
    const generator = new MeePhaseGenerator();
    const plan = generator.generate({
      id: "evt-123",
      type: "drift",
      payload: {},
      timestamp: Date.now()
    });

    expect(plan.phaseNumber).toBe(30);
    expect(plan.title).toContain("Meta‑Evolution follow‑up");
    expect(plan.objectives).toContain("Analyze trigger event");
    expect(plan.tasks).toContain("Create documentation updates");
  });

  it("synthesizes patches from phase plan", () => {
    const synth = new MeePatchSynthesizer();
    const plan = {
      id: "prop-123",
      title: "Test Phase 30",
      trigger: { id: "evt-1", type: "drift", payload: {}, timestamp: Date.now() },
      status: "pending" as const,
      filesCreated: [],
      planSummary: "summary",
      timestamp: Date.now()
    };
    const patchSet = synth.synthesize(plan);

    expect(patchSet.proposalId).toBe("prop-123");
    expect(patchSet.patches.length).toBe(1);
    expect(patchSet.patches[0].path).toBe("docs/mee/proposal-prop-123.md");
    expect(patchSet.patches[0].type).toBe("create");
  });

  it("validates patch sets in MeeValidator", () => {
    const validator = new MeeValidator();
    const report = validator.validate({ proposalId: "prop-123", patches: [] });

    expect(report.passed).toBe(false);
    expect(report.compilePassed).toBe(true);
    expect(report.testsPassed).toBe(true);
    expect(report.issues?.length).toBe(1);
    expect(report.issues?.[0].type).toBe("empty");
  });

  it("MeeValidator detects file conflicts and schema errors", () => {
    const validator = new MeeValidator();
    
    // File conflict: protected file modification
    const patchSetConflict: PhasePatchSet = {
      proposalId: "prop-1",
      patches: [
        { path: "projects/cic/src/mee/mee-schema.ts", type: "modify", content: "// hacked" }
      ]
    };
    const reportConflict = validator.validatePatchSet(patchSetConflict);
    expect(reportConflict.passed).toBe(false);
    expect(reportConflict.issues?.some(i => i.type === "conflict")).toBe(true);

    // Schema syntax check: invalid JSON
    const patchSetInvalidJson: PhasePatchSet = {
      proposalId: "prop-2",
      patches: [
        { path: "docs/mee/test.json", type: "create", content: "{invalid" }
      ]
    };
    const reportJson = validator.validatePatchSet(patchSetInvalidJson);
    expect(reportJson.passed).toBe(false);
    expect(reportJson.issues?.some(i => i.type === "schema")).toBe(true);

    // Schema syntax check: valid JSON
    const patchSetValidJson: PhasePatchSet = {
      proposalId: "prop-3",
      patches: [
        { path: "docs/mee/test.json", type: "create", content: '{"ok": true}' }
      ]
    };
    const reportValidJson = validator.validatePatchSet(patchSetValidJson);
    expect(reportValidJson.passed).toBe(true);
  });

  it("AutoEvolutionEngine runs tick lifecycle successfully", async () => {
    const store = new CkgStore(tempGraphPath);
    // Write graph with orphans to trigger scan
    store.save({
      nodes: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }],
      edges: [],
      meta: {
        hotspots: {
          centralNodes: [],
          orphans: [{ id: "skill:orphan", type: "skill", name: "Orphan Skill" }]
        }
      }
    });

    const trigger = new MeeTriggerEngine(store);
    const generator = new MeePhaseGenerator();
    const synth = new MeePatchSynthesizer();
    const validator = new MeeValidator();
    const proposalStore = new MeeProposalStore(path.resolve(__dirname, "../../"));

    // Ensure temp data directory is clean
    const tempStorePath = path.resolve(__dirname, "../../projects/cic/data/mee/proposals.json");
    if (fs.existsSync(tempStorePath)) {
      fs.unlinkSync(tempStorePath);
    }

    const autoEngine = new AutoEvolutionEngine(trigger, generator, synth, validator, proposalStore);
    
    // Manually set enabled state to true so we can await a single tick synchronously
    (autoEngine as any).enabled = true;
    autoEngine.setRequireApproval(true);

    await autoEngine.tick();

    const proposals = proposalStore.loadAll();
    expect(proposals.length).toBe(1);
    expect(proposals[0].status).toBe("validated"); // because validation passed but requireApproval is true
    expect(proposals[0].filesCreated.length).toBeGreaterThan(0);

    // Cleanup store file
    if (fs.existsSync(tempStorePath)) {
      fs.unlinkSync(tempStorePath);
    }
    autoEngine.disable();
  });

  it("registers Express routes", () => {
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

    registerMeeRoutes(routerProxy as any);

    expect(mockRouter.post.some(r => r.path === "/mee/propose")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/proposals")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/proposals/:id")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/triggers")).toBe(true);
    expect(mockRouter.post.some(r => r.path === "/mee/validate/:id")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/patch/:id")).toBe(true);
    expect(mockRouter.post.some(r => r.path === "/mee/apply/:id")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/validation/:id")).toBe(true);
    expect(mockRouter.get.some(r => r.path === "/mee/auto/status")).toBe(true);
    expect(mockRouter.post.some(r => r.path === "/mee/auto/enable")).toBe(true);
    expect(mockRouter.post.some(r => r.path === "/mee/auto/disable")).toBe(true);
  });
});
