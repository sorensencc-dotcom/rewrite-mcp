"use strict";
// File: projects/cic/src/mee/mee-negotiation-agent.ts | Date: 2026-06-03 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeNegotiationAgent = void 0;
class MeeNegotiationAgent {
    constructor(proposal, patchSet) {
        this.proposal = proposal;
        this.patchSet = patchSet;
    }
    analyzeConflicts(other) {
        if (!this.patchSet || !other.patchSet)
            return null;
        for (const a of this.patchSet.patches) {
            for (const b of other.patchSet.patches) {
                if (a.path === b.path) {
                    return {
                        type: "reorder",
                        reason: `Both modify ${a.path}`,
                        details: { path: a.path }
                    };
                }
            }
        }
        return null;
    }
    proposeResolution(other) {
        return this.analyzeConflicts(other);
    }
    acceptResolution(_resolution) {
        return true;
    }
    rejectResolution(_resolution) {
        return false;
    }
}
exports.MeeNegotiationAgent = MeeNegotiationAgent;
//# sourceMappingURL=mee-negotiation-agent.js.map