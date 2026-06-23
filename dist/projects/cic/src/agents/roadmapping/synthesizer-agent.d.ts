/**
 * synthesizer-agent.ts
 * ARPS Phase 22.3 — Roadmap Synthesizer Agent
 * Rewrites fenced sections of CIC_MASTER_ROADMAP.md and CIC_PROJECT_STATE.md.
 */
import { RoadmapDelta } from "./harvester-agent.js";
export declare class RoadmapSynthesizer {
    private docsRoot;
    constructor(docsRoot: string);
    private loadFile;
    private writeFile;
    replaceFencedSection(content: string, fenceId: string, newBlock: string): string;
    validateMarkdown(content: string): {
        valid: boolean;
        reason?: string;
    };
    buildPhase22Markdown(delta: RoadmapDelta): string;
    updateHealthLedger(oldLedgerText: string, delta: RoadmapDelta): string;
    updateNextAscent(oldAscentText: string, delta: RoadmapDelta): string;
    buildPhase23Markdown(delta: RoadmapDelta): string;
    updateHealthLedgerPhase23(oldLedgerText: string, delta: RoadmapDelta): string;
    updateNextAscentPhase23(oldAscentText: string, delta: RoadmapDelta): string;
    run(delta: RoadmapDelta, opts: {
        dryRun: boolean;
    }): Promise<string[]>;
    private writeFailedPreview;
}
//# sourceMappingURL=synthesizer-agent.d.ts.map