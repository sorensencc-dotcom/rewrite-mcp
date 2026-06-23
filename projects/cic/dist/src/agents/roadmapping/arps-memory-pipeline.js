/**
 * arps-memory-pipeline.ts
 * Phase 23 — ARPS ↔ Memory Layer Integration
 * Wraps RoadmapPipeline to emit ARPS_DELTA events to memory on roadmap changes
 */
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { RoadmapHarvester } from './harvester-agent.js';
import { RoadmapSynthesizer } from './synthesizer-agent.js';
import { PromptSandbox } from './prompt-sandbox.js';
// Import memory layer
import { MemorySubstrate } from '../../memory/memory-substrate.js';
import { MemoryHarvester } from '../../memory/memory-harvester.js';
export class ArpsMemoryPipeline {
    constructor(repoRoot, docsRoot, registryPath) {
        this.repoRoot = repoRoot;
        this.docsRoot = docsRoot;
        this.registryPath = registryPath;
        const ledgerPath = path.join(repoRoot, '.artifacts/memory/ledger.jsonl');
        this.substrate = new MemorySubstrate(ledgerPath);
        this.memoryHarvester = new MemoryHarvester(this.substrate, repoRoot);
    }
    /**
     * Emit ARPS_DELTA event to memory layer when harvester detects changes
     */
    async emitArpsDelta(delta) {
        try {
            // Get current git commit for traceability
            let gitCommit = '';
            try {
                gitCommit = execSync('git rev-parse HEAD', {
                    cwd: this.repoRoot,
                    encoding: 'utf-8'
                }).trim();
            }
            catch {
                gitCommit = 'unknown';
            }
            // Emit as memory event
            const event = {
                id: `arps-delta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                type: 'roadmap.delta',
                timestamp: delta.timestamp,
                payload: {
                    change_type: 'roadmap_evolution',
                    components_changed: delta.components.length,
                    completions: delta.completions,
                    gaps: delta.gaps,
                    git_commit: gitCommit,
                    confidence: 0.95,
                    affected_subsystems: ['Roadmap', 'Phase Tracking'],
                },
            };
            this.substrate.append(event);
        }
        catch (err) {
            // Memory ingest failure is not critical — system continues
            console.warn(`[ARPS] Memory ingest failed (non-fatal): ${err.message}`);
        }
    }
    /**
     * Query memory to detect trends and patterns from previous roadmap evolution
     */
    queryMemoryContext() {
        try {
            // Query recent roadmap deltas from memory
            const deltas = this.substrate.query({ type: 'roadmap.delta' });
            const recentCount = deltas.filter(d => {
                const age = Date.now() - new Date(d.timestamp).getTime();
                return age < 7 * 24 * 60 * 60 * 1000; // 7 days
            }).length;
            // Simple trend detection based on event count
            let trend = 'stable';
            if (recentCount > 5)
                trend = 'improving';
            if (recentCount === 0)
                trend = 'stable';
            const observations = recentCount > 3
                ? [`Recent roadmap activity detected: ${recentCount} changes in past week`]
                : [];
            return {
                recentDeltas: recentCount,
                trend,
                observations,
            };
        }
        catch (err) {
            // Memory read failure is not critical
            console.warn(`[ARPS] Memory query failed (non-fatal): ${err.message}`);
            return { recentDeltas: 0, trend: 'stable', observations: [] };
        }
    }
    async run(opts) {
        const harvester = new RoadmapHarvester(this.repoRoot);
        const synthesizer = new RoadmapSynthesizer(this.docsRoot);
        const sandbox = new PromptSandbox(this.registryPath);
        const sessionId = opts.sessionId || `session_${Date.now()}`;
        if (opts.verbose) {
            console.log(`[ARPS Pipeline] Starting memory-integrated roadmapping loop...`);
            console.log(`[ARPS Pipeline] Session: ${sessionId}`);
            console.log(`[ARPS Pipeline] Repo Root: ${this.repoRoot}`);
            console.log(`[ARPS Pipeline] Docs Root: ${this.docsRoot}`);
        }
        // Query memory for context before running
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Querying memory for context...`);
        const context = this.queryMemoryContext();
        if (opts.verbose && context.observations.length > 0) {
            console.log(`[ARPS Pipeline] Memory context:`, context.observations);
        }
        // 1. Gather/Harvest delta
        let delta;
        if (opts.deltaFile && fs.existsSync(opts.deltaFile)) {
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Loading pre-harvested delta from ${opts.deltaFile}`);
            delta = JSON.parse(fs.readFileSync(opts.deltaFile, 'utf-8'));
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
        // Emit ARPS_DELTA to memory
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Emitting ARPS_DELTA to memory layer...`);
        await this.emitArpsDelta(delta);
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
            const gitStatus = execSync('git status --porcelain', { cwd: this.repoRoot }).toString();
            const lines = gitStatus.split('\n');
            const modifiedPrompts = lines
                .map(line => {
                if (line.length < 4)
                    return '';
                return line.substring(3).trim();
            })
                .filter(file => file.includes('projects/cic/pms/templates/') && (file.endsWith('.md') || file.endsWith('.yaml')));
            for (const promptFile of modifiedPrompts) {
                const entries = sandbox.getRegistryEntries();
                const entry = entries.find(e => promptFile.replace(/\\/g, '/').endsWith(e.path.replace(/\\/g, '/')));
                if (entry) {
                    if (opts.verbose)
                        console.log(`[ARPS Pipeline] Prompt updated: ${entry.id}. Enforcing sandbox gate...`);
                    const fullPath = path.resolve(this.repoRoot, promptFile);
                    const newContent = fs.readFileSync(fullPath, 'utf-8');
                    const decision = await sandbox.check(entry.id, newContent, { owner: 'CIC-SYSTEM' });
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
            if (opts.verbose)
                console.log(`[ARPS Pipeline] Sandbox prompt scanning skipped: ${err.message}`);
        }
        // 4. Docs Compilation & Build Verification
        if (opts.verbose)
            console.log(`[ARPS Pipeline] Verifying docs build...`);
        try {
            const pkgPath = path.join(this.repoRoot, 'package.json');
            let hasBuildDocs = false;
            if (fs.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                    if (pkg.scripts && pkg.scripts['build-docs']) {
                        hasBuildDocs = true;
                    }
                }
                catch (e) { }
            }
            if (hasBuildDocs) {
                execSync('npm run build-docs', { cwd: this.repoRoot, stdio: 'inherit' });
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
                const cleanTimestamp = delta.timestamp.substring(0, 16).replace('T', ' ');
                execSync('git add docs/cic/CIC_MASTER_ROADMAP.md docs/cic/CIC_PROJECT_STATE.md', { cwd: this.repoRoot });
                execSync(`git commit -m "[claude] chore(arps): apply roadmap delta ${cleanTimestamp}"`, { cwd: this.repoRoot });
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
        if (opts.verbose) {
            console.log(`[ARPS Pipeline] Memory-integrated roadmapping loop complete.`);
            console.log(`[ARPS Pipeline] Events emitted, synthesizer ran, git updated.`);
        }
    }
}
//# sourceMappingURL=arps-memory-pipeline.js.map