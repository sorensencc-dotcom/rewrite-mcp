// File: projects/cic/evolution/src/amb/ambIntentBundler.ts | Date: 2026-06-05 | v1.0.0

import crypto from "node:crypto";
import { AmbIntentArtifact } from "../types/ambIntent.js";
import { IntentBundleArtifact, BundleType } from "../types/ambStrategic.js";

export class AmbIntentBundler {
  /**
   * Group intents into coherent bundles by domain affinity.
   */
  public bundleIntents(runId: string, intents: AmbIntentArtifact[]): IntentBundleArtifact[] {
    if (intents.length === 0) return [];

    // 1. Classify each intent into a bundle type
    const buckets = new Map<BundleType, AmbIntentArtifact[]>();

    for (const intent of intents) {
      const bundleType = this.classifyBundleType(intent);
      if (!buckets.has(bundleType)) {
        buckets.set(bundleType, []);
      }
      buckets.get(bundleType)!.push(intent);
    }

    // 2. Form bundles from each bucket
    const bundles: IntentBundleArtifact[] = [];
    const now = new Date().toISOString();

    for (const [bundleType, memberIntents] of buckets) {
      const bundle = this.formBundle(runId, bundleType, memberIntents, now);
      bundles.push(bundle);
    }

    // 3. Sort bundles by aggregate priority (highest first)
    bundles.sort((a, b) => b.aggregate_priority_score - a.aggregate_priority_score);

    return bundles;
  }

  /**
   * Classify a single intent into its bundle type based on target_domains.
   */
  public classifyBundleType(intent: AmbIntentArtifact): BundleType {
    const domains = intent.target_domains || {};

    if (domains.ckg_graph) return "graph_cleanup";
    if (domains.mas_topology) return "mas_stability";
    if (domains.rl_fusion) return "tenant_redesign";
    if (domains.cic_config) return "planner_tuning";

    // Fallback: infer from intent_type
    const type = (intent.intent_type || "").toLowerCase();
    if (type.includes("distill") || type.includes("graph")) return "graph_cleanup";
    if (type.includes("mas") || type.includes("stability")) return "mas_stability";
    if (type.includes("fusion") || type.includes("redesign")) return "tenant_redesign";
    if (type.includes("planner") || type.includes("tuning")) return "planner_tuning";

    // Default to planner_tuning as safest category
    return "planner_tuning";
  }

  /**
   * Form a bundle from a set of intents of the same type.
   */
  private formBundle(
    runId: string,
    bundleType: BundleType,
    intents: AmbIntentArtifact[],
    timestamp: string
  ): IntentBundleArtifact {
    // Aggregate priority = max of members
    const aggregatePriority = Math.max(...intents.map(i => i.priority_score));

    // Aggregate risk = max of members
    const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const riskLabels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
    const maxRiskIdx = Math.max(...intents.map(i => riskOrder[i.risk_class] ?? 0));
    const aggregateRisk = riskLabels[maxRiskIdx];

    // Estimated impact = sum of all desired_outcomes metrics
    const estimatedImpact: Record<string, number> = {};
    for (const intent of intents) {
      for (const [key, value] of Object.entries(intent.desired_outcomes?.metrics || {})) {
        estimatedImpact[key] = (estimatedImpact[key] || 0) + value;
      }
    }

    // Summary
    const summary = this.generateBundleSummary(bundleType, intents);

    return {
      bundle_id: `bundle-${bundleType}-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      timestamp,
      bundle_type: bundleType,
      intent_ids: intents.map(i => i.intent_id),
      summary,
      estimated_impact: estimatedImpact,
      aggregate_risk_class: aggregateRisk,
      aggregate_priority_score: parseFloat(aggregatePriority.toFixed(4))
    };
  }

  /**
   * Generate a human-readable summary for a bundle.
   */
  private generateBundleSummary(bundleType: BundleType, intents: AmbIntentArtifact[]): string {
    const count = intents.length;
    const summaryMap: Record<BundleType, string> = {
      graph_cleanup: `CKG graph cleanup bundle: ${count} intent(s) targeting stale node reduction and entropy compression.`,
      mas_stability: `MAS stability bundle: ${count} intent(s) targeting agent routing optimization and consensus improvement.`,
      tenant_redesign: `Tenant redesign bundle: ${count} intent(s) targeting Rewrite Labs fusion and conversion optimization.`,
      planner_tuning: `Planner tuning bundle: ${count} intent(s) targeting heuristic refinement and configuration optimization.`
    };
    return summaryMap[bundleType];
  }
}
