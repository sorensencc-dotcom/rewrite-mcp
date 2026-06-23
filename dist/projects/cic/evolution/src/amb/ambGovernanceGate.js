"use strict";
// File: projects/cic/evolution/src/amb/ambGovernanceGate.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbGovernanceGate = void 0;
class AmbGovernanceGate {
    constructor(masGate, rlGate) {
        this.masGate = masGate;
        this.rlGate = rlGate;
    }
    evaluateIntents(intents) {
        const approvedIntents = [];
        const allIntentsWithStatus = [];
        const rejections = [];
        for (const intent of intents) {
            const updated = this.applyGovernance(intent);
            allIntentsWithStatus.push(updated);
            if (updated.status === "approved") {
                approvedIntents.push(updated);
            }
            else {
                rejections.push({
                    intentId: updated.intent_id,
                    reason: updated.blocked_reason || updated.governance_notes || "Governance gating filter applied."
                });
            }
        }
        const report = {
            timestamp: Date.now(),
            evaluatedCount: intents.length,
            approvedCount: approvedIntents.length,
            rejectedCount: rejections.length,
            rejections
        };
        return {
            approvedIntents,
            allIntentsWithStatus,
            report
        };
    }
    applyGovernance(intent) {
        const updated = { ...intent };
        // Forbidden → blocked
        if (intent.policy_alignment?.forbidden_domain) {
            updated.status = "blocked";
            updated.blocked_reason = "Forbidden domain per charter.";
            return updated;
        }
        // RL-dependent gate
        if (intent.policy_alignment?.rl_dependent && !this.rlGate.isRlHealthy()) {
            updated.status = "blocked";
            updated.blocked_reason = "Rewrite Labs tests failing.";
            return updated;
        }
        // MAS stability gate
        if (!this.masGate.isMasStableFor(intent)) {
            updated.status = "downgraded";
            updated.governance_notes = "MAS health below threshold; intent downgraded.";
            return updated;
        }
        // High-risk → require operator
        if (intent.risk_class === "high") {
            updated.status = "pending";
            updated.governance_notes = "High-risk intent; operator approval required.";
            return updated;
        }
        // Default: approved
        updated.status = "approved";
        return updated;
    }
}
exports.AmbGovernanceGate = AmbGovernanceGate;
//# sourceMappingURL=ambGovernanceGate.js.map