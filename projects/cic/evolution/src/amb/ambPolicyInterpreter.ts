// File: projects/cic/evolution/src/amb/ambPolicyInterpreter.ts | Date: 2026-06-05 | v1.0.0

import { AmbIntentArtifact } from "../types/ambIntent.js";

export class AmbPolicyInterpreter {
  public interpretPolicy(intent: Partial<AmbIntentArtifact>): {
    alignment: AmbIntentArtifact["policy_alignment"];
    risk_class: AmbIntentArtifact["risk_class"];
  } {
    const summary = (intent.justification?.summary || "").toLowerCase();
    const type = (intent.intent_type || "").toLowerCase();

    // 1. Forbidden Domain Check
    const forbiddenKeywords = [
      "security",
      "credentials",
      "authorization",
      "authentication",
      "billing",
      "financial",
      "payment",
      "disable logging",
      "remove lineage",
      "bypass audit"
    ];
    const forbidden = forbiddenKeywords.some(kw => summary.includes(kw));

    // 2. Operator Required Check
    const isMasTopology = intent.target_domains?.mas_topology === true || type.includes("mas_stability");
    const isPlannerTuning = type.includes("planner_tuning");
    const isFusionDomain = intent.target_domains?.rl_fusion === true || type.includes("rl_fusion");
    const operator = isMasTopology || isPlannerTuning || isFusionDomain;

    // 3. Lineage Required Check
    const isTenantRef = intent.justification?.references?.some(ref => ref.includes("tenant")) ?? false;
    const lineage = isTenantRef || isFusionDomain || intent.target_domains?.ckg_graph === true;

    // 4. RL Dependent Check
    const rlDependent = isFusionDomain;

    // Risk Classification Determination
    let risk: AmbIntentArtifact["risk_class"] = "low";
    if (isMasTopology || isPlannerTuning || intent.target_domains?.ckg_graph === true) {
      risk = "medium";
    }
    if (rlDependent || isTenantRef) {
      risk = "high";
    }

    return {
      alignment: {
        forbidden_domain: forbidden,
        operator_required: operator,
        lineage_required: lineage,
        rl_dependent: rlDependent
      },
      risk_class: risk
    };
  }
}
