"use strict";
/**
 * roadmapping.test.ts
 * ARPS Phase 22.5 — Roadmapping and Sandbox Unit Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const prompt_sandbox_js_1 = require("../../src/agents/roadmapping/prompt-sandbox.js");
const harvester_agent_js_1 = require("../../src/agents/roadmapping/harvester-agent.js");
const synthesizer_agent_js_1 = require("../../src/agents/roadmapping/synthesizer-agent.js");
const pipeline_js_1 = require("../../src/agents/roadmapping/pipeline.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
(0, vitest_1.describe)("ARPS Prompt Sandbox & Roadmapping Suite", () => {
    const tempDir = node_path_1.default.resolve(__dirname, "../../.temp-test-arps");
    const registryPath = node_path_1.default.join(tempDir, "registry.yaml");
    const templatePath = node_path_1.default.join(tempDir, "templates/system/core.prompt.md");
    const roadmapPath = node_path_1.default.join(tempDir, "cic/CIC_MASTER_ROADMAP.md");
    const statePath = node_path_1.default.join(tempDir, "cic/CIC_PROJECT_STATE.md");
    const taskPath = node_path_1.default.join(tempDir, "task.md");
    (0, vitest_1.beforeEach)(() => {
        // Setup test environment directories and files
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(templatePath), { recursive: true });
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(roadmapPath), { recursive: true });
        // Write a dummy prompt registry
        node_fs_1.default.writeFileSync(registryPath, `prompts:
  - id: cic.system.core
    path: templates/system/core.prompt.md
    owner: CIC-SYSTEM
    min_similarity: 0.90
`, "utf-8");
        // Write base prompt template
        node_fs_1.default.writeFileSync(templatePath, "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the River Rouge and Willow Run plants.", "utf-8");
        // Write base roadmap document
        node_fs_1.default.writeFileSync(roadmapPath, `# Master Roadmap
<!-- ARPS:PHASE_22:BEGIN -->
<!-- ARPS:PHASE_22:END -->
`, "utf-8");
        // Write base state document
        node_fs_1.default.writeFileSync(statePath, `# Project State
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
`, "utf-8");
        // Write dummy task list
        node_fs_1.default.writeFileSync(taskPath, "- [ ] Implement Phase 22: Autonomous Roadmap & Prompt Sandbox (ARPS)\n", "utf-8");
    });
    (0, vitest_1.afterEach)(() => {
        // Clean up temporary test files
        try {
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        catch (e) {
            // Ignored
        }
    });
    (0, vitest_1.describe)("Prompt Sandbox Tests", () => {
        (0, vitest_1.it)("should authorize edits that satisfy similarity floors", async () => {
            const sandbox = new prompt_sandbox_js_1.PromptSandbox(registryPath);
            const decision = await sandbox.check("cic.system.core", "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the Dearborn and Willow Run plants.", { owner: "CIC-SYSTEM" });
            (0, vitest_1.expect)(decision.allowed).toBe(true);
            (0, vitest_1.expect)(decision.similarity).toBeGreaterThanOrEqual(0.85); // Jaccard fallback floor
        });
        (0, vitest_1.it)("should reject edits when owner mismatch occurs", async () => {
            const sandbox = new prompt_sandbox_js_1.PromptSandbox(registryPath);
            const decision = await sandbox.check("cic.system.core", "New text content", { owner: "OTHER-AGENT" });
            (0, vitest_1.expect)(decision.allowed).toBe(false);
            (0, vitest_1.expect)(decision.reason).toContain("Ownership mismatch");
        });
        (0, vitest_1.it)("should fallback to Jaccard and gate at 0.85 when forced or service offline", async () => {
            const sandbox = new prompt_sandbox_js_1.PromptSandbox(registryPath);
            // Valid edit passing Jaccard >= 0.85
            const decisionOk = await sandbox.check("cic.system.core", "This is the core system prompt configuration file for the Cast Iron Charlie feature documentary. It establishes the primary source records, archive integrations, and RAG retrieval pipelines for analyzing the life, patents, and engineering legacy of Charles Emil Sorensen at the River Rouge and Willow Run factory.", { owner: "CIC-SYSTEM", forceFallback: true });
            (0, vitest_1.expect)(decisionOk.allowed).toBe(true);
            (0, vitest_1.expect)(decisionOk.method).toBe("jaccard");
            // Drifting edit failing Jaccard < 0.85
            const decisionFail = await sandbox.check("cic.system.core", "Completely different layout describing unrelated items", { owner: "CIC-SYSTEM", forceFallback: true });
            (0, vitest_1.expect)(decisionFail.allowed).toBe(false);
            (0, vitest_1.expect)(decisionFail.method).toBe("jaccard");
            (0, vitest_1.expect)(decisionFail.reason).toContain("Drift violation");
        });
    });
    (0, vitest_1.describe)("Roadmap Harvester Tests", () => {
        (0, vitest_1.it)("should parse task.md checkbox items into component deltas", async () => {
            const harvester = new harvester_agent_js_1.RoadmapHarvester(tempDir);
            const delta = await harvester.run();
            (0, vitest_1.expect)(delta.components.length).toBeGreaterThan(0);
            const taskComp = delta.components.find(c => c.source === "tasks");
            (0, vitest_1.expect)(taskComp).toBeDefined();
            (0, vitest_1.expect)(taskComp?.name).toContain("Implement Phase 22");
            (0, vitest_1.expect)(taskComp?.status).toBe("PENDING");
        });
    });
    (0, vitest_1.describe)("Roadmap Synthesizer Tests", () => {
        (0, vitest_1.it)("should rewrite fenced markdown blocks correctly", async () => {
            const synthesizer = new synthesizer_agent_js_1.RoadmapSynthesizer(tempDir);
            const delta = {
                components: [
                    { name: "Prompt Sandbox", status: "COMPLETE", details: "Implement sandbox", source: "tasks" }
                ],
                completions: ["Prompt Sandbox"],
                gaps: [],
                timestamp: new Date().toISOString()
            };
            const files = await synthesizer.run(delta, { dryRun: false });
            (0, vitest_1.expect)(files.length).toBe(2);
            // Verify that markdown fences were correctly replaced in both files
            const roadmapContent = node_fs_1.default.readFileSync(roadmapPath, "utf-8");
            (0, vitest_1.expect)(roadmapContent).toContain("Registry-Backed Prompt Sandbox");
            (0, vitest_1.expect)(roadmapContent).toContain("Status: 🟢 COMPLETE");
            const stateContent = node_fs_1.default.readFileSync(statePath, "utf-8");
            (0, vitest_1.expect)(stateContent).toContain("🟢 ACTIVE");
        });
        (0, vitest_1.it)("should fail validation and refuse to overwrite on unbalanced syntax", async () => {
            const synthesizer = new synthesizer_agent_js_1.RoadmapSynthesizer(tempDir);
            const badContent = `
# Bad File
\`\`\`ts
unbalanced code block
`;
            const validation = synthesizer.validateMarkdown(badContent);
            (0, vitest_1.expect)(validation.valid).toBe(false);
            (0, vitest_1.expect)(validation.reason).toContain("Unbalanced code blocks");
        });
    });
    (0, vitest_1.describe)("Pipeline Golden Scenario", () => {
        (0, vitest_1.it)("should run pipeline successfully in dry-run mode leaving files unchanged", async () => {
            const pipeline = new pipeline_js_1.RoadmapPipeline(tempDir, tempDir, registryPath);
            const beforeRoadmap = node_fs_1.default.readFileSync(roadmapPath, "utf-8");
            const beforeState = node_fs_1.default.readFileSync(statePath, "utf-8");
            // Running dry-run pipeline
            await pipeline.run({ dryRun: true, verbose: false });
            // Verify files are indeed unmodified
            const afterRoadmap = node_fs_1.default.readFileSync(roadmapPath, "utf-8");
            const afterState = node_fs_1.default.readFileSync(statePath, "utf-8");
            (0, vitest_1.expect)(afterRoadmap).toBe(beforeRoadmap);
            (0, vitest_1.expect)(afterState).toBe(beforeState);
            // Verify artifacts directory exists and holds delta
            const artifactsDir = node_path_1.default.join(tempDir, "projects/cic/.artifacts/roadmap");
            (0, vitest_1.expect)(node_fs_1.default.existsSync(artifactsDir)).toBe(true);
            const files = node_fs_1.default.readdirSync(artifactsDir);
            (0, vitest_1.expect)(files.some(f => f.startsWith("delta-"))).toBe(true);
        });
    });
});
//# sourceMappingURL=roadmapping.test.js.map