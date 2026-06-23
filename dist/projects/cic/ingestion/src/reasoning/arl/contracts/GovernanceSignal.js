"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESCALATION_PATHS = void 0;
exports.ESCALATION_PATHS = {
    MEMORY_INTEGRITY: {
        name: 'Memory Integrity Check',
        trigger: 'drift_magnitude_high',
        handler: 'memory_consistency_validator',
        priority: 'high',
    },
    NARRATIVE_COHERENCE: {
        name: 'Narrative Coherence Review',
        trigger: 'narrative_risk_high',
        handler: 'narrative_continuity_enforcer',
        priority: 'medium',
    },
    OPERATOR_REVIEW: {
        name: 'Operator Manual Review',
        trigger: 'ambiguous_decision',
        handler: 'operator_dashboard',
        priority: 'high',
    },
};
//# sourceMappingURL=GovernanceSignal.js.map