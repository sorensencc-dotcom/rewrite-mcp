// File: projects/cic/evolution/src/amb/ambPolicyInterpreter.ts | Date: 2026-06-05 | v1.0.0

import { AmbIntentArtifact } from "../types/ambIntent.js";
import { PolicyCharter } from "../types/ambPolicyCharter.js";

export class AmbPolicyInterpreter {
  constructor(private charter: PolicyCharter) {}

  applyPolicy(intent: AmbIntentArtifact): AmbIntentArtifact {
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

  private isForbiddenDomain(intent: AmbIntentArtifact): boolean {
    const summary = (intent.justification?.summary || "").toLowerCase();
    const type = (intent.intent_type || "").toLowerCase();

    // Check target domains matching forbidden domains
    const hasForbiddenTarget = this.charter.forbiddenDomains.some(domain =>
      intent.target_domains[domain as keyof typeof intent.target_domains] === true
    );
    if (hasForbiddenTarget) return true;

    // Direct text checks for safety fallback
    const forbiddenKeywords = ["security", "auth", "billing", "financial", "disable logging", "remove lineage", "bypass audit"];
    return forbiddenKeywords.some(kw => summary.includes(kw) || type.includes(kw));
  }

  private isOperatorRequired(intent: AmbIntentArtifact): boolean {
    const type = (intent.intent_type || "").toLowerCase();
    const hasOperatorTarget = this.charter.operatorOnlyDomains.some(domain =>
      intent.target_domains[domain as keyof typeof intent.target_domains] === true
    );
    if (hasOperatorTarget) return true;

    return type.includes("planner_tuning") || type.includes("mas_stability");
  }

  private isLineageRequired(intent: AmbIntentArtifact): boolean {
    const hasLineageTarget = this.charter.lineageRequiredDomains.some(domain =>
      intent.target_domains[domain as keyof typeof intent.target_domains] === true
    );
    if (hasLineageTarget) return true;

    const summary = (intent.justification?.summary || "").toLowerCase();
    return summary.includes("tenant") || summary.includes("site");
  }

  private isRlDependent(intent: AmbIntentArtifact): boolean {
    return (
      intent.intent_type === "rl_fusion" ||
      intent.target_domains?.rl_fusion === true
    );
  }

  private computeRiskClass(intent: AmbIntentArtifact): AmbIntentArtifact["risk_class"] {
    if (intent.target_domains?.rl_fusion || intent.target_domains?.ckg_graph) {
      return "high";
    }
    if (intent.target_domains?.mas_topology || intent.target_domains?.cic_config) {
      return "medium";
    }
    return "low";
  }
}
