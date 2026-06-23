"use strict";
// File: projects/cic/src/mee/mee-consensus-engine.ts | Date: 2026-06-04 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeConsensusEngine = void 0;
class MeeConsensusEngine {
    constructor(threshold = 70) {
        this.threshold = threshold;
    }
    scoreProposal(proposalId, critiques, cycle = 1) {
        let score = 100;
        for (const critique of critiques) {
            if (critique.severity === "error") {
                score -= 40;
            }
            else if (critique.severity === "warn") {
                score -= 20;
            }
            else if (critique.severity === "info") {
                score -= 5;
            }
        }
        // Apply cycle decay factor to prevent infinite refinement loops
        if (cycle > 1) {
            score -= (cycle - 1) * 10;
        }
        if (score < 0) {
            score = 0;
        }
        const passed = score >= this.threshold;
        return {
            proposalId,
            score,
            critiquesCount: critiques.length,
            passed
        };
    }
    determineResult(proposalId, score, critiques, cycle, maxCycles = 3) {
        let decision;
        if (score >= this.threshold) {
            decision = "ready";
        }
        else if (cycle < maxCycles) {
            decision = "needs_revision";
        }
        else {
            decision = "blocked";
        }
        return {
            proposalId,
            decision,
            score,
            critiques,
            cycles: cycle
        };
    }
}
exports.MeeConsensusEngine = MeeConsensusEngine;
//# sourceMappingURL=mee-consensus-engine.js.map