"use strict";
// File: projects/cic/src/mee/mee-synthesizer.ts | Date: 2026-06-03 | v1.1.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeePatchSynthesizer = void 0;
class MeePatchSynthesizer {
    synthesize(proposal) {
        const patches = [
            {
                path: `docs/mee/proposal-${proposal.id}.md`,
                type: "create",
                content: `# Proposal ${proposal.id}\nGenerated automatically.\nTitle: ${proposal.title}\nSummary: ${proposal.planSummary}`
            }
        ];
        if (proposal.refactorPlan && proposal.refactorPlan.patches) {
            patches.push(...proposal.refactorPlan.patches);
        }
        return {
            proposalId: proposal.id,
            patches
        };
    }
}
exports.MeePatchSynthesizer = MeePatchSynthesizer;
//# sourceMappingURL=mee-synthesizer.js.map