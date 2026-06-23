"use strict";
/**
 * pipeline.ts
 * ARPS Phase 22.4 — Closed-loop Roadmapping Pipeline
 * Orchestrates harvester → synthesizer → sandbox → git → docs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapPipeline = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_child_process_1 = require("node:child_process");
const harvester_agent_js_1 = require("./harvester-agent.js");
const synthesizer_agent_js_1 = require("./synthesizer-agent.js");
const prompt_sandbox_js_1 = require("./prompt-sandbox.js");
class RoadmapPipeline {
    constructor(repoRoot, docsRoot, registryPath) {
        this.repoRoot = repoRoot;
        this.docsRoot = docsRoot;
        this.registryPath = registryPath;
    }
    async run(opts) {
        const harvester = new harvester_agent_js_1.RoadmapHarvester(this.repoRoot);
        const synthesizer = new synthesizer_agent_js_1.RoadmapSynthesizer(this.docsRoot);
        const sandbox = new prompt_sandbox_js_1.PromptSandbox(this.registryPath);
        if (opts.verbose) {
            console.log(`[ARPS Pipeline] Starting roadmapping loop...`);
            console.log(`[ARPS Pipeline] Repo Root: ${this.repoRoot}`);
            console.log(`[ARPS Pipeline] Docs Root: ${this.docsRoot}`);
            console.log(`[ARPS Pipeline] Registry: ${this.registryPath}`);
        }
        // 1. Gather/Harvest delta
        let delta;
        if (opts.deltaFile && node_fs_1.default.existsSync(opts.deltaFile)) {
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Loading pre-harvested delta from ${opts.deltaFile}`);
            delta = JSON.parse(node_fs_1.default.readFileSync(opts.deltaFile, "utf-8"));
        }
        else {
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Running Harvester...`);
            delta = await harvester.run();
        }
        if (opts.verbose) {
            console.log(`[ARPS Pipeline] Δ Roadmap computed with ${delta.components.length} components.`);
            console.log(`[ARPS Pipeline] Completed tasks count: ${delta.completions.length}`);
            console.log(`[ARPS Pipeline] Gaps count: ${delta.gaps.length}`);
        }
        // 2. Synthesize Markdown Updates
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Running Synthesizer...`);
        const modifiedFiles = await synthesizer.run(delta, { dryRun: opts.dryRun });
        if (opts.verbose) {
            console.log(`[ARPS Pipeline] Synthesizer run complete. Affected files:`);
            modifiedFiles.forEach(f => console.log(`  - ${f}`));
        }
        // 3. Prompt Sandbox Integrity check on modified prompt files
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Checking for prompt edits...`);
        try {
            const gitStatus = (0, node_child_process_1.execSync)("git status --porcelain", { cwd: this.repoRoot }).toString();
            const lines = gitStatus.split("\n");
            const modifiedPrompts = lines
                .map(line => {
                if (line.length < 4)
                    return "";
                return line.substring(3).trim();
            })
                .filter(file => file.includes("projects/cic/pms/templates/") && (file.endsWith(".md") || file.endsWith(".yaml")));
            for (const promptFile of modifiedPrompts) {
                // Resolve logical prompt ID from path
                const entries = sandbox.getRegistryEntries();
                const entry = entries.find(e => promptFile.replace(/\\/g, "/").endsWith(e.path.replace(/\\/g, "/")));
                if (entry) {
                    if (opts.verbose)
                        console.log(`[ARPS Pipeline] Prompt updated: ${entry.id}. Enforcing sandbox gate...`);
                    const fullPath = node_path_1.default.resolve(this.repoRoot, promptFile);
                    const newContent = node_fs_1.default.readFileSync(fullPath, "utf-8");
                    // Use CIC-SYSTEM owner for validation checks
                    const decision = await sandbox.check(entry.id, newContent, { owner: "CIC-SYSTEM" });
                    if (!decision.allowed) {
                        console.error(`[ARPS Pipeline] Sandbox Check REJECTED: ${decision.reason}`);
                        throw new Error(`[ARPS Pipeline] Sandbox Check REJECTED: ${decision.reason}`);
                    }
                    if (opts.verbose)
                        console.log(`[ARPS Pipeline] Sandbox Check APPROVED: ${decision.reason}`);
                }
            }
        }
        catch (err) {
            // Git command might fail if not in a repository context
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Sandbox prompt scanning skipped: ${err.message}`);
        }
        // 4. Docs Compilation & Build Verification
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Verifying docs build...`);
        try {
            const pkgPath = node_path_1.default.join(this.repoRoot, "package.json");
            let hasBuildDocs = false;
            if (node_fs_1.default.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(node_fs_1.default.readFileSync(pkgPath, "utf-8"));
                    if (pkg.scripts && pkg.scripts["build-docs"]) {
                        hasBuildDocs = true;
                    }
                }
                catch (e) { }
            }
            if (hasBuildDocs) {
                // We run npm run build-docs (or sync-docs) under the monorepo root
                (0, node_child_process_1.execSync)("npm run build-docs", { cwd: this.repoRoot, stdio: "inherit" });
                if (opts.verbose)
                    console.log(`[ARPS Pipeline] Docs build verification passed.`);
            }
            else {
                if (opts.verbose)
                    console.log(`[ARPS Pipeline] Skipping docs build verification: no build-docs script in package.json.`);
            }
        }
        catch (err) {
            console.error(`[ARPS Pipeline] Docs build verification failed: ${err.message}`);
            throw new Error(`[ARPS Pipeline] Docs build verification failed: ${err.message}`);
        }
        // 5. Git Commit Execution
        if (opts.commit && !opts.dryRun) {
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Executing Git commit...`);
            try {
                const cleanTimestamp = delta.timestamp.substring(0, 16).replace("T", " ");
                (0, node_child_process_1.execSync)("git add docs/cic/CIC_MASTER_ROADMAP.md docs/cic/CIC_PROJECT_STATE.md", { cwd: this.repoRoot });
                (0, node_child_process_1.execSync)(`git commit -m "[gemini] chore(arps): apply roadmap delta ${cleanTimestamp}"`, { cwd: this.repoRoot });
                if (opts.verbose)
                    console.log(`[ARPS Pipeline] Git commit successfully generated.`);
            }
            catch (err) {
                console.error(`[ARPS Pipeline] Failed to commit changes: ${err.message}`);
            }
        }
        else {
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Dry-run or commit flag disabled. Skipping git commit.`);
        }
    }
}
exports.RoadmapPipeline = RoadmapPipeline;
//# sourceMappingURL=pipeline.js.map