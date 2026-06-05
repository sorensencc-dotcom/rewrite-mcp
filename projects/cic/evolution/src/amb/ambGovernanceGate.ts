// File: projects/cic/evolution/src/amb/ambGovernanceGate.ts | Date: 2026-06-05 | v1.0.0

import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbMasHealthGate } from "./ambMasHealthGate.js";
import { AmbRlTestGate } from "./ambRlTestGate.js";

export interface GovernanceReport {
  timestamp: number;
  evaluatedCount: number;
  approvedCount: number;
  rejectedCount: number;
  rejections: { intentId: string; reason: string }[];
}

export class AmbGovernanceGate {
  constructor(
    private readonly masGate: AmbMasHealthGate,
    private readonly rlGate: AmbRlTestGate
  ) {}

  public evaluateIntents(intents: AmbIntentArtifact[]): {
    approvedIntents: AmbIntentArtifact[];
    allIntentsWithStatus: AmbIntentArtifact[];
    report: GovernanceReport;
  } {
    const approvedIntents: AmbIntentArtifact[] = [];
    const allIntentsWithStatus: AmbIntentArtifact[] = [];
    const rejections: { intentId: string; reason: string }[] = [];

    for (const intent of intents) {
      const updated = this.applyGovernance(intent);
      allIntentsWithStatus.push(updated);

      if (updated.status === "approved") {
        approvedIntents.push(updated);
      } else {
        rejections.push({
          intentId: updated.intent_id,
          reason: updated.blocked_reason || updated.governance_notes || "Governance gating filter applied."
        });
      }
    }

    const report: GovernanceReport = {
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

  private applyGovernance(intent: AmbIntentArtifact): AmbIntentArtifact {
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
