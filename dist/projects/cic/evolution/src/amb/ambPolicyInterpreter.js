"use strict";
// File: projects/cic/evolution/src/amb/ambPolicyInterpreter.ts | Date: 2026-06-05 | v1.0.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbPolicyInterpreter = void 0;
class AmbPolicyInterpreter {
    constructor(charter) {
        this.charter = charter;
    }
    applyPolicy(intent) {
        const updated = { ...intent };
        if (!updated.policy_alignment) {
            updated.policy_alignment = {
                forbidden_domain: false,
                operator_required: false,
                lineage_required: false,
                rl_dependent: false
            };
        }
        updated.policy_alignment.forbidden_domain = this.isForbiddenDomain(intent);
        updated.policy_alignment.operator_required = this.isOperatorRequired(intent);
        updated.policy_alignment.lineage_required = this.isLineageRequired(intent);
        updated.policy_alignment.rl_dependent = this.isRlDependent(intent);
        updated.risk_class = this.computeRiskClass(intent);
        return updated;
    }
    isForbiddenDomain(intent) {
        const summary = (intent.justification?.summary || "").toLowerCase();
        const type = (intent.intent_type || "").toLowerCase();
        // Check target domains matching forbidden domains
        const hasForbiddenTarget = this.charter.forbiddenDomains.some(domain => intent.target_domains[domain] === true);
        if (hasForbiddenTarget)
            return true;
        // Direct text checks for safety fallback
        const forbiddenKeywords = ["security", "auth", "billing", "financial", "disable logging", "remove lineage", "bypass audit"];
        return forbiddenKeywords.some(kw => summary.includes(kw) || type.includes(kw));
    }
    isOperatorRequired(intent) {
        const type = (intent.intent_type || "").toLowerCase();
        const hasOperatorTarget = this.charter.operatorOnlyDomains.some(domain => intent.target_domains[domain] === true);
        if (hasOperatorTarget)
            return true;
        return type.includes("planner_tuning") || type.includes("mas_stability");
    }
    isLineageRequired(intent) {
        const hasLineageTarget = this.charter.lineageRequiredDomains.some(domain => intent.target_domains[domain] === true);
        if (hasLineageTarget)
            return true;
        const summary = (intent.justification?.summary || "").toLowerCase();
        return summary.includes("tenant") || summary.includes("site");
    }
    isRlDependent(intent) {
        return (intent.intent_type === "rl_fusion" ||
            intent.target_domains?.rl_fusion === true);
    }
    computeRiskClass(intent) {
        if (intent.target_domains?.rl_fusion || intent.target_domains?.ckg_graph) {
            return "high";
        }
        if (intent.target_domains?.mas_topology || intent.target_domains?.cic_config) {
            return "medium";
        }
        return "low";
    }
}
exports.AmbPolicyInterpreter = AmbPolicyInterpreter;
//# sourceMappingURL=ambPolicyInterpreter.js.map