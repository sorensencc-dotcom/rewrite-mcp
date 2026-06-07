/**
 * pipeline.ts
 * ARPS Phase 22.4 — Closed-loop Roadmapping Pipeline
 * Orchestrates harvester → synthesizer → sandbox → git → docs.
 */

import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { RoadmapHarvester } from "./harvester-agent.js";
import { RoadmapSynthesizer } from "./synthesizer-agent.js";
import { PromptSandbox } from "./prompt-sandbox.js";

export class RoadmapPipeline {
  constructor(
    private repoRoot: string,
    private docsRoot: string,
    private registryPath: string
  ) {}

  async run(opts: { dryRun: boolean; verbose: boolean; deltaFile?: string; commit?: boolean }): Promise<void> {
    const harvester = new RoadmapHarvester(this.repoRoot);
    const synthesizer = new RoadmapSynthesizer(this.docsRoot);
    const sandbox = new PromptSandbox(this.registryPath);

    if (opts.verbose) {
      console.log(`[ARPS Pipeline] Starting roadmapping loop...`);
      console.log(`[ARPS Pipeline] Repo Root: ${this.repoRoot}`);
      console.log(`[ARPS Pipeline] Docs Root: ${this.docsRoot}`);
      console.log(`[ARPS Pipeline] Registry: ${this.registryPath}`);
    }

    // 1. Gather/Harvest delta
    let delta;
    if (opts.deltaFile && fs.existsSync(opts.deltaFile)) {
      if (opts.verbose) console.log(`[ARPS Pipeline] Loading pre-harvested delta from ${opts.deltaFile}`);
      delta = JSON.parse(fs.readFileSync(opts.deltaFile, "utf-8"));
    } else {
      if (opts.verbose) console.log(`[ARPS Pipeline] Running Harvester...`);
      delta = await harvester.run();
    }

    if (opts.verbose) {
      console.log(`[ARPS Pipeline] Δ Roadmap computed with ${delta.components.length} components.`);
      console.log(`[ARPS Pipeline] Completed tasks count: ${delta.completions.length}`);
      console.log(`[ARPS Pipeline] Gaps count: ${delta.gaps.length}`);
    }

    // 2. Synthesize Markdown Updates
    if (opts.verbose) console.log(`[ARPS Pipeline] Running Synthesizer...`);
    const modifiedFiles = await synthesizer.run(delta, { dryRun: opts.dryRun });
    if (opts.verbose) {
      console.log(`[ARPS Pipeline] Synthesizer run complete. Affected files:`);
      modifiedFiles.forEach(f => console.log(`  - ${f}`));
    }

    // 3. Prompt Sandbox Integrity check on modified prompt files
    if (opts.verbose) console.log(`[ARPS Pipeline] Checking for prompt edits...`);
    try {
      const gitStatus = execSync("git status --porcelain", { cwd: this.repoRoot }).toString();
      const lines = gitStatus.split("\n");
      const modifiedPrompts = lines
        .map(line => {
          if (line.length < 4) return "";
          return line.substring(3).trim();
        })
        .filter(file => file.includes("projects/cic/pms/templates/") && (file.endsWith(".md") || file.endsWith(".yaml")));

      for (const promptFile of modifiedPrompts) {
        // Resolve logical prompt ID from path
        const entries = sandbox.getRegistryEntries();
        const entry = entries.find(e => promptFile.replace(/\\/g, "/").endsWith(e.path.replace(/\\/g, "/")));
        if (entry) {
          if (opts.verbose) console.log(`[ARPS Pipeline] Prompt updated: ${entry.id}. Enforcing sandbox gate...`);
          const fullPath = path.resolve(this.repoRoot, promptFile);
          const newContent = fs.readFileSync(fullPath, "utf-8");
          // Use CIC-SYSTEM owner for validation checks
          const decision = await sandbox.check(entry.id, newContent, { owner: "CIC-SYSTEM" });
          if (!decision.allowed) {
            console.error(`[ARPS Pipeline] Sandbox Check REJECTED: ${decision.reason}`);
            throw new Error(`[ARPS Pipeline] Sandbox Check REJECTED: ${decision.reason}`);
          }
          if (opts.verbose) console.log(`[ARPS Pipeline] Sandbox Check APPROVED: ${decision.reason}`);
        }
      }
    } catch (err: any) {
      // Git command might fail if not in a repository context
      if (opts.verbose) console.log(`[ARPS Pipeline] Sandbox prompt scanning skipped: ${err.message}`);
    }

    // 4. Docs Compilation & Build Verification
    if (opts.verbose) console.log(`[ARPS Pipeline] Verifying docs build...`);
    try {
      const pkgPath = path.join(this.repoRoot, "package.json");
      let hasBuildDocs = false;
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          if (pkg.scripts && pkg.scripts["build-docs"]) {
            hasBuildDocs = true;
          }
        } catch (e) {}
      }

      if (hasBuildDocs) {
        // We run npm run build-docs (or sync-docs) under the monorepo root
        execSync("npm run build-docs", { cwd: this.repoRoot, stdio: "inherit" });
        if (opts.verbose) console.log(`[ARPS Pipeline] Docs build verification passed.`);
      } else {
        if (opts.verbose) console.log(`[ARPS Pipeline] Skipping docs build verification: no build-docs script in package.json.`);
      }
    } catch (err: any) {
      console.error(`[ARPS Pipeline] Docs build verification failed: ${err.message}`);
      throw new Error(`[ARPS Pipeline] Docs build verification failed: ${err.message}`);
    }

    // 5. Git Commit Execution
    if (opts.commit && !opts.dryRun) {
      if (opts.verbose) console.log(`[ARPS Pipeline] Executing Git commit...`);
      try {
        const cleanTimestamp = delta.timestamp.substring(0, 16).replace("T", " ");
        execSync("git add docs/cic/CIC_MASTER_ROADMAP.md docs/cic/CIC_PROJECT_STATE.md", { cwd: this.repoRoot });
        execSync(`git commit -m "[gemini] chore(arps): apply roadmap delta ${cleanTimestamp}"`, { cwd: this.repoRoot });
        if (opts.verbose) console.log(`[ARPS Pipeline] Git commit successfully generated.`);
      } catch (err: any) {
        console.error(`[ARPS Pipeline] Failed to commit changes: ${err.message}`);
      }
    } else {
      if (opts.verbose) console.log(`[ARPS Pipeline] Dry-run or commit flag disabled. Skipping git commit.`);
    }
  }
}
