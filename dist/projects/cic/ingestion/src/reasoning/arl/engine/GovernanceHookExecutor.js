"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceHookExecutor = void 0;
class GovernanceHookExecutor {
    constructor() {
        this.auditLog = [];
    }
    executeThreshold(phaseId, thresholdResult, driftVector, narrativeRiskLevel) {
        const reasons = this.buildReasonStrings(thresholdResult);
        const driftMagnitude = Math.sqrt(driftVector.semantic ** 2 +
            driftVector.temporal ** 2 +
            driftVector.narrative ** 2 +
            driftVector.causal ** 2);
        let decision;
        let escalationPath;
        if (thresholdResult.decision === 'ACCEPT') {
            decision = 'ACCEPT';
        }
        else if (thresholdResult.decision === 'REJECT') {
            decision = 'REJECT';
            if (narrativeRiskLevel === 'high') {
                escalationPath = 'narrative_coherence_check';
            }
        }
        else {
            // QUARANTINE
            decision = 'ESCALATE';
            if (driftMagnitude > 0.25) {
                escalationPath = 'memory_integrity_check';
            }
            else if (narrativeRiskLevel === 'medium' || narrativeRiskLevel === 'high') {
                escalationPath = 'narrative_coherence_check';
            }
            else {
                escalationPath = 'operator_review';
            }
        }
        const signal = {
            phaseId,
            decision,
            reasons,
            driftVector,
            narrativeRiskLevel,
            operatorOverrideAllowed: decision !== 'REJECT',
            escalationPath,
            auditEntry: {
                timestamp: new Date(),
                phaseId,
                decision,
                reasonCount: reasons.length,
            },
        };
        this.auditLog.push(signal);
        return signal;
    }
    buildReasonStrings(result) {
        const reasons = [];
        for (const check of result.failed) {
            reasons.push(`${check.name} failed: expected ${check.threshold}, got ${check.actual.toFixed(3)}`);
        }
        if (result.rejectCode) {
            reasons.push(`Error code: ${result.rejectCode}`);
        }
        return reasons;
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    clearAuditLog() {
        this.auditLog = [];
    }
}
exports.GovernanceHookExecutor = GovernanceHookExecutor;
//# sourceMappingURL=GovernanceHookExecutor.js.map