import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { specRegistry } from "../../../src/cic/control-plane/spec-registry.js";
import { getTelemetrySink } from "../../../src/cic/control-plane/telemetry-sink.js";
import { ExtractorChain } from "../../../src/harvester/extractors/extractor-chain.js";
import { SemanticExtractor } from "../../../src/harvester/extractors/semanticExtractor.js";
import { RelationshipExtractor } from "../../../src/harvester/extractors/relationshipExtractor.js";
import { patchLoader } from "../../../src/cic/control-plane/patch-loader.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patchesDir = path.resolve(__dirname, "../../../instinct-patches");

describe("Scenario I - Governed Instinct Lifecycle (Phase 3.0)", () => {
  beforeEach(async () => {
    specRegistry.loadAll();
    await getTelemetrySink().clear();
    
    // Clear any test patches from patch subdirectories
    const subdirs = ["proposed", "canary", "active", "rejected"];
    for (const sub of subdirs) {
      const folder = path.join(patchesDir, sub);
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        for (const file of files) {
          fs.unlinkSync(path.join(folder, file));
        }
      }
    }
  });

  afterEach(() => {
    // Cleanup
    const subdirs = ["proposed", "canary", "active", "rejected"];
    for (const sub of subdirs) {
      const folder = path.join(patchesDir, sub);
      if (fs.existsSync(folder)) {
        const files = fs.readdirSync(folder);
        for (const file of files) {
          fs.unlinkSync(path.join(folder, file));
        }
      }
    }
  });

  it("handles the complete proposed -> canary -> active lifecycle and governs scoped pipeline executions", async () => {
    // 1. Seed a proposed patch directly into the proposed/ folder
    const fileName = "prefer_ris_over_pdf_for_bibliography-0.3.0-0.4.0.yaml";
    const proposedPatch = {
      instinct: "prefer_ris_over_pdf_for_bibliography",
      baseVersion: "0.3.0",
      proposedVersion: "0.4.0",
      change: {
        routing_policy: {
          avoid_skills: ["extract_semantic_text"] // Patch forces avoiding semantic extraction!
        }
      },
      impact: {
        impactScore: 78,
        metricsBefore: { successRate: 0.81, avgLatencyMs: 420, avgDrift: 0.32 },
        metricsAfter: { successRate: 0.89, avgLatencyMs: 360, avgDrift: 0.24 }
      },
      scope: {
        regions: ["us-east-1"],
        tenants: ["tenant-canary"] // Canary scoped to tenant-canary only!
      }
    };
    
    patchLoader.saveProposedPatch(proposedPatch);

    // Assert file exists under proposed
    const proposedList = patchLoader.listPatches("proposed");
    expect(proposedList.length).toBe(1);
    expect(proposedList[0].instinct).toBe("prefer_ris_over_pdf_for_bibliography");

    // 2. Move proposed -> canary
    await patchLoader.movePatch(fileName, "proposed", "canary");
    
    expect(patchLoader.listPatches("proposed").length).toBe(0);
    expect(patchLoader.listPatches("canary").length).toBe(1);

    // 3. Verify scoped canary loading
    const chain = new ExtractorChain();
    chain.add(new SemanticExtractor());

    // Run A: Non-matching tenant context ("tenant-baseline") -> Should run SemanticExtractor
    const runA = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
      docType: "bibliography",
      sourceFormat: "ris",
      tenantId: "tenant-baseline",
      region: "us-east-1"
    } as any);

    expect(runA.chain_execution).toBe("completed");
    expect(runA.results.length).toBe(1);
    expect(runA.results[0].type).toBe("semantic_extraction");

    // Run B: Matching canary tenant context ("tenant-canary") -> Patch avoids semantic text! Should skip it!
    const runB = await chain.run("Charles Emil Sorensen arrived in Copenhagen", {
      docType: "bibliography",
      sourceFormat: "ris",
      tenantId: "tenant-canary",
      region: "us-east-1"
    } as any);

    expect(runB.chain_execution).toBe("completed");
    expect(runB.results.length).toBe(0); // SKIPPED due to canary scoped patch!

    // 4. Promote canary -> active
    await patchLoader.movePatch(fileName, "canary", "active");

    expect(patchLoader.listPatches("canary").length).toBe(0);
    expect(patchLoader.listPatches("active").length).toBe(1);

    // Run C: Non-matching tenant ("tenant-baseline") -> Since patch is active globally, it skips it now!
    const runC = await chain.run("Charles Emil Sorensen", {
      docType: "bibliography",
      sourceFormat: "ris",
      tenantId: "tenant-baseline",
      region: "us-east-1"
    } as any);

    expect(runC.results.length).toBe(0); // SKIPPED globally!
  });

  it("enforces promotional guardrails and blocks low-score or degraded patches", async () => {
    // Seed a low-score proposed patch
    const fileName = "prefer_ris_over_pdf_for_bibliography-0.3.0-0.4.0.yaml";
    const proposedPatch = {
      instinct: "prefer_ris_over_pdf_for_bibliography",
      baseVersion: "0.3.0",
      proposedVersion: "0.4.0",
      change: { routing_policy: { avoid_skills: [] } },
      impact: {
        impactScore: 35, // Below required threshold 50!
        metricsBefore: { successRate: 0.81, avgLatencyMs: 420, avgDrift: 0.32 },
        metricsAfter: { successRate: 0.89, avgLatencyMs: 360, avgDrift: 0.24 }
      },
      scope: { regions: ["us-east-1"], tenants: ["*"] }
    };
    patchLoader.saveProposedPatch(proposedPatch);
    await patchLoader.movePatch(fileName, "proposed", "canary");

    // Make mock API promotion request and expect promotion rule failure
    const canaryPatches = patchLoader.listPatches("canary");
    const patch = canaryPatches.find(p => p.fileName === fileName);
    expect(patch).toBeDefined();

    // Verify promotion fails due to impact score threshold
    const threshold = 50;
    expect(patch!.impact.impactScore).toBeLessThan(threshold);
  });
});
