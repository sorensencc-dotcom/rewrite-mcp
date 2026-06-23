"use strict";
// File: projects/cic/src/mee/mee-negotiation-engine.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeNegotiationEngine = void 0;
class MeeNegotiationEngine {
    constructor() {
        this.transcript = [];
    }
    runRound(agents, round) {
        let changed = false;
        for (let i = 0; i < agents.length; i++) {
            for (let j = i + 1; j < agents.length; j++) {
                const a = agents[i];
                const b = agents[j];
                const resolution = a.proposeResolution(b);
                this.transcript.push({
                    round,
                    agentA: a.proposal.id,
                    agentB: b.proposal.id,
                    resolution
                });
                if (resolution) {
                    changed = true;
                }
            }
        }
        return changed;
    }
    runUntilStable(agents) {
        this.transcript = []; // Reset on new run
        let round = 1;
        while (this.runRound(agents, round)) {
            round++;
            if (round > 10)
                break;
        }
    }
    getTranscript() {
        return this.transcript;
    }
    produceConsensusPlan(agents) {
        return agents
            .map((a) => a.proposal)
            .sort((a, b) => a.title.localeCompare(b.title));
    }
}
exports.MeeNegotiationEngine = MeeNegotiationEngine;
//# sourceMappingURL=mee-negotiation-engine.js.map