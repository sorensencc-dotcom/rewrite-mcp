/**
 * roadmapping.test.ts
 * ARPS Phase 22.5 — Roadmapping and Sandbox Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PromptSandbox } from "../../src/agents/roadmapping/prompt-sandbox.js";
import { RoadmapHarvester } from "../../src/agents/roadmapping/harvester-agent.js";
import { RoadmapSynthesizer } from "../../src/agents/roadmapping/synthesizer-agent.js";
import { RoadmapPipeline } from "../../src/agents/roadmapping/pipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ARPS Prompt Sandbox & Roadmapping Suite", () => {
  const tempDir = path.resolve(__dirname, "../../.temp-test-arps");
  const registryPath = path.join(tempDir, "registry.yaml");
  const templatePath = path.join(tempDir, "templates/system/core.prompt.md");
  const roadmapPath = path.join(tempDir, "cic/CIC_MASTER_ROADMAP.md");
  const statePath = path.join(tempDir, "cic/CIC_PROJECT_STATE.md");
  const taskPath = path.join(tempDir, "task.md");

  beforeEach(() => {
    // Setup test environment directories and files
    fs.mkdirSync(path.dirname(templatePath), { recursive: true });
    fs.mkdirSync(path.dirname(roadmapPath), { recursive: true });

    // Write a dummy prompt registry
    fs.writeFileSync(
      registryPath,
      `prompts:
  - id: cic.system.core
    path: templates/system/core.prompt.md
    owner: CIC-SYSTEM
    min_similarity: 0.90
`,
      "utf-8"
    );

    // Write base prompt template
    fs.writeFileSync(
      templatePath,
      "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the River Rouge and Willow Run plants.",
      "utf-8"
    );

    // Write base roadmap document
    fs.writeFileSync(
      roadmapPath,
      `# Master Roadmap
<!-- ARPS:PHASE_22:BEGIN -->
<!-- ARPS:PHASE_22:END -->
`,
      "utf-8"
    );

    // Write base state document
    fs.writeFileSync(
      statePath,
      `# Project State
## 2. Component Health Ledger
<!-- ARPS:HEALTH_LEDGER:BEGIN -->
| Pillar | Subsystem | Version | Status | Scoped Details |
| :--- | :--- | :--- | :---: | :--- |
| **ARPS** | Prompt Sandbox | v0.1.0 | 🟡 PENDING | Registry-backed drift gates |
<!-- ARPS:HEALTH_LEDGER:END -->

## 4. Next Development Ascent
<!-- ARPS:NEXT_ASCENT:BEGIN -->
- [ ] Implement Phase 22: Autonomous Roadmap & Prompt Sandbox (ARPS)
<!-- ARPS:NEXT_ASCENT:END -->
`,
      "utf-8"
    );

    // Write dummy task list
    fs.writeFileSync(taskPath, "- [ ] Implement Phase 22: Autonomous Roadmap & Prompt Sandbox (ARPS)\n", "utf-8");
  });

  afterEach(() => {
    // Clean up temporary test files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignored
    }
  });

  describe("Prompt Sandbox Tests", () => {
    it("should authorize edits that satisfy similarity floors", async () => {
      const sandbox = new PromptSandbox(registryPath);
      const decision = await sandbox.check(
        "cic.system.core",
        "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the Dearborn and Willow Run plants.",
        { owner: "CIC-SYSTEM" }
      );
      expect(decision.allowed).toBe(true);
      expect(decision.similarity).toBeGreaterThanOrEqual(0.85); // Jaccard fallback floor
    });

    it("should reject edits when owner mismatch occurs", async () => {
      const sandbox = new PromptSandbox(registryPath);
      const decision = await sandbox.check("cic.system.core", "New text content", { owner: "OTHER-AGENT" });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("Ownership mismatch");
    });

    it("should fallback to Jaccard and gate at 0.85 when forced or service offline", async () => {
      const sandbox = new PromptSandbox(registryPath);
      // Valid edit passing Jaccard >= 0.85
      const decisionOk = await sandbox.check(
        "cic.system.core",
        "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the River Rouge and Willow Run factory.",
        { owner: "CIC-SYSTEM", forceFallback: true }
      );
      expect(decisionOk.allowed).toBe(true);
      expect(decisionOk.method).toBe("jaccard");

      // Drifting edit failing Jaccard < 0.85
      const decisionFail = await sandbox.check(
        "cic.system.core",
        "Completely different layout describing unrelated items",
        { owner: "CIC-SYSTEM", forceFallback: true }
      );
      expect(decisionFail.allowed).toBe(false);
      expect(decisionFail.method).toBe("jaccard");
      expect(decisionFail.reason).toContain("Drift violation");
    });
  });

  describe("Roadmap Harvester Tests", () => {
    it("should parse task.md checkbox items into component deltas", async () => {
      const harvester = new RoadmapHarvester(tempDir);
      const delta = await harvester.run();
      
      expect(delta.components.length).toBeGreaterThan(0);
      const taskComp = delta.components.find(c => c.source === "tasks");
      expect(taskComp).toBeDefined();
      expect(taskComp?.name).toContain("Implement Phase 22");
      expect(taskComp?.status).toBe("PENDING");
    });
  });

  describe("Roadmap Synthesizer Tests", () => {
    it("should rewrite fenced markdown blocks correctly", async () => {
      const synthesizer = new RoadmapSynthesizer(tempDir);
      const delta = {
        components: [
          { name: "Prompt Sandbox", status: "COMPLETE", details: "Implement sandbox", source: "tasks" }
        ],
        completions: ["Prompt Sandbox"],
        gaps: [],
        timestamp: new Date().toISOString()
      };

      const files = await synthesizer.run(delta, { dryRun: false });
      expect(files.length).toBe(2);

      // Verify that markdown fences were correctly replaced in both files
      const roadmapContent = fs.readFileSync(roadmapPath, "utf-8");
      expect(roadmapContent).toContain("Registry-Backed Prompt Sandbox");
      expect(roadmapContent).toContain("Status: 🟢 COMPLETE");

      const stateContent = fs.readFileSync(statePath, "utf-8");
      expect(stateContent).toContain("🟢 ACTIVE");
    });

    it("should fail validation and refuse to overwrite on unbalanced syntax", async () => {
      const synthesizer = new RoadmapSynthesizer(tempDir);
      const badContent = `
# Bad File
\`\`\`ts
unbalanced code block
`;
      const validation = synthesizer.validateMarkdown(badContent);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("Unbalanced code blocks");
    });
  });

  describe("Pipeline Golden Scenario", () => {
    it("should run pipeline successfully in dry-run mode leaving files unchanged", async () => {
      const pipeline = new RoadmapPipeline(tempDir, tempDir, registryPath);
      
      const beforeRoadmap = fs.readFileSync(roadmapPath, "utf-8");
      const beforeState = fs.readFileSync(statePath, "utf-8");

      // Running dry-run pipeline
      await pipeline.run({ dryRun: true, verbose: false });

      // Verify files are indeed unmodified
      const afterRoadmap = fs.readFileSync(roadmapPath, "utf-8");
      const afterState = fs.readFileSync(statePath, "utf-8");

      expect(afterRoadmap).toBe(beforeRoadmap);
      expect(afterState).toBe(beforeState);

      // Verify artifacts directory exists and holds delta
      const artifactsDir = path.join(tempDir, "projects/cic/.artifacts/roadmap");
      expect(fs.existsSync(artifactsDir)).toBe(true);
      const files = fs.readdirSync(artifactsDir);
      expect(files.some(f => f.startsWith("delta-"))).toBe(true);
    });
  });
});
