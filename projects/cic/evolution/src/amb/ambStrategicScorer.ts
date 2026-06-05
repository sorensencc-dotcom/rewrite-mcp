// File: projects/cic/evolution/src/amb/ambStrategicScorer.ts | Date: 2026-06-05 | v1.0.0

import { AmbIntentArtifact } from "../types/ambIntent.js";
import { AmbMemorySnapshot, IntentBundleArtifact } from "../types/ambStrategic.js";

export class AmbStrategicScorer {
  private memory: AmbMemorySnapshot | null;

  constructor(memory: AmbMemorySnapshot | null) {
    this.memory = memory;
  }

  /**
   * Compute strategic score for a single intent.
   * Formula: impact / (risk * operator_burden)
   */
  public scoreIntent(intent: AmbIntentArtifact): number {
    const impact = this.computeImpact(intent);
    const risk = this.mapRisk(intent.risk_class);
    const burden = this.computeOperatorBurden(intent);
    const denominator = risk * burden;

    const score = denominator > 0 ? impact / denominator : 0;
    return parseFloat(Math.min(1.0, Math.max(0, score)).toFixed(4));
  }

  /**
   * Compute strategic score for an intent bundle.
   * Uses the aggregate of member intent scores weighted by bundle priority.
   */
  public scoreBundle(bundle: IntentBundleArtifact, intents: AmbIntentArtifact[]): number {
    const memberIntents = intents.filter(i => bundle.intent_ids.includes(i.intent_id));
    if (memberIntents.length === 0) return 0;

    const totalScore = memberIntents.reduce((sum, i) => sum + this.scoreIntent(i), 0);
    const avgScore = totalScore / memberIntents.length;

    // Boost by aggregate priority (higher priority bundles rank higher)
    const priorityBoost = 1.0 + (bundle.aggregate_priority_score * 0.5);
    return parseFloat(Math.min(1.0, avgScore * priorityBoost).toFixed(4));
  }

  /**
   * Rank intents by strategic score (descending).
   * Attaches strategic_score to each intent.
   */
  public rankIntents(intents: AmbIntentArtifact[]): (AmbIntentArtifact & { strategic_score: number })[] {
    return intents
      .map(i => ({
        ...i,
        strategic_score: this.scoreIntent(i)
      }))
      .sort((a, b) => b.strategic_score - a.strategic_score);
  }

  /**
   * Compute impact from desired_outcomes metrics + historical boost.
   */
  private computeImpact(intent: AmbIntentArtifact): number {
    const metricsValues = Object.values(intent.desired_outcomes?.metrics || {});
    const baseImpact = metricsValues.reduce((sum, v) => sum + Math.abs(v), 0);

    const historicalBoost = this.computeHistoricalBoost(intent.intent_type);
    return baseImpact * historicalBoost;
  }

  /**
   * Compute historical boost factor for an intent type.
   * Higher success rate in past runs → higher boost.
   */
  public computeHistoricalBoost(intentType: string): number {
    if (!this.memory || this.memory.proposals.length === 0) return 1.0;

    // Find past intents of this type
    const pastIntents = this.memory.intents.filter(i => i.intent_type === intentType);
    if (pastIntents.length === 0) return 1.0;

    // Find proposals linked to those intents
    const intentIds = new Set(pastIntents.map(i => i.intent_id));
    const linkedProposals = this.memory.proposals.filter(p =>
      p.source_intent_id && intentIds.has(p.source_intent_id)
    );

    if (linkedProposals.length === 0) return 1.0;

    const successCount = linkedProposals.filter(p => p.applied && !p.failed).length;
    const successRate = successCount / linkedProposals.length;

    // Boost range: 0.5 (all failed) to 1.5 (all succeeded)
    return 0.5 + successRate;
  }

  /**
   * Map risk class to numeric weight.
   */
  private mapRisk(risk: AmbIntentArtifact["risk_class"]): number {
    if (risk === "low") return 1;
    if (risk === "medium") return 2;
    return 3;
  }

  /**
   * Compute operator burden from required actions.
   */
  private computeOperatorBurden(intent: AmbIntentArtifact): number {
    const actions = intent.constraints?.required_operator_actions || [];
    return 1 + actions.length;
  }
}
