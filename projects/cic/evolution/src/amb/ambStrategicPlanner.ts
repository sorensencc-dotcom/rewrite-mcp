// File: projects/cic/evolution/src/amb/ambStrategicPlanner.ts | Date: 2026-06-05 | v1.0.0

import crypto from "node:crypto";
import { AmbIntentArtifact } from "../types/ambIntent.js";
import {
  AmbMemorySnapshot,
  IntentBundleArtifact,
  StrategicPlanArtifact,
  PlannedIntent
} from "../types/ambStrategic.js";

export interface DetectedPattern {
  pattern_type: "recurring_drift" | "persistent_mas_instability" | "rl_plateau" | "stale_graph";
  severity: "low" | "medium" | "high";
  description: string;
  evidence: Record<string, number>;
}

export class AmbStrategicPlanner {
  private readonly defaultHorizon = 3;

  /**
   * Generate a strategic plan from current intents, bundles, and memory.
   */
  public generatePlan(
    runId: string,
    intents: AmbIntentArtifact[],
    bundles: IntentBundleArtifact[],
    memory: AmbMemorySnapshot | null
  ): StrategicPlanArtifact {
    const now = new Date().toISOString();

    // 1. Detect patterns from memory
    const patterns = this.detectPatterns(memory);

    // 2. Sequence planned steps across the horizon
    const plannedIntents = this.sequenceSteps(patterns, bundles, intents);

    // 3. Compute expected impact projection
    const expectedImpact = this.projectImpact(plannedIntents, bundles, memory);

    // 4. Collect policy constraints that apply
    const policyConstraints = this.collectPolicyConstraints(intents);

    return {
      plan_id: `plan-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      timestamp: now,
      version: "v0.1.0",
      horizon_runs: Math.min(this.defaultHorizon, Math.max(1, plannedIntents.length)),
      planned_intents: plannedIntents,
      expected_impact: expectedImpact,
      policy_constraints: policyConstraints,
      source_bundles: bundles.map(b => b.bundle_id)
    };
  }

  /**
   * Detect recurring patterns from cross-run memory.
   */
  public detectPatterns(memory: AmbMemorySnapshot | null): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (!memory) return patterns;

    // 1. Recurring drift: drift index consistently above 0.2 in recent runs
    if (memory.drift_history.length >= 2) {
      const recentDrift = memory.drift_history.slice(-5);
      const avgDrift = recentDrift.reduce((sum, d) => sum + (d.tenant_drift_index ?? 0), 0) / recentDrift.length;
      if (avgDrift > 0.2) {
        patterns.push({
          pattern_type: "recurring_drift",
          severity: avgDrift > 0.5 ? "high" : "medium",
          description: `Persistent tenant drift detected over ${recentDrift.length} runs (avg: ${avgDrift.toFixed(3)}).`,
          evidence: { average_drift: parseFloat(avgDrift.toFixed(3)), run_count: recentDrift.length }
        });
      }
    }

    // 2. Persistent MAS instability: error rate above 0.03 in recent runs
    if (memory.mas_health_history.length >= 2) {
      const recentMas = memory.mas_health_history.slice(-5);
      const avgError = recentMas.reduce((sum, m) => sum + m.globalErrorRate, 0) / recentMas.length;
      if (avgError > 0.03) {
        patterns.push({
          pattern_type: "persistent_mas_instability",
          severity: avgError > 0.06 ? "high" : "medium",
          description: `MAS error rate persistently elevated over ${recentMas.length} runs (avg: ${avgError.toFixed(4)}).`,
          evidence: { average_error_rate: parseFloat(avgError.toFixed(4)), run_count: recentMas.length }
        });
      }
    }

    // 3. RL plateau: no improvement in RL metrics across recent runs
    if (memory.rl_impact_history.length >= 2) {
      const recentRl = memory.rl_impact_history.slice(-5);
      const improvements = recentRl.map(r => Object.values(r.metrics).reduce((s, v) => s + v, 0));
      const isFlat = improvements.every(v => Math.abs(v - improvements[0]) < 0.01);
      if (isFlat && improvements.length >= 2) {
        patterns.push({
          pattern_type: "rl_plateau",
          severity: "low",
          description: `Rewrite Labs metrics have plateaued over ${recentRl.length} runs.`,
          evidence: { stable_value: improvements[0] || 0, run_count: recentRl.length }
        });
      }
    }

    // 4. Stale graph: high proportion of blocked/failed graph intents
    const graphIntents = memory.intents.filter(i => i.intent_type === "graph_distillation");
    if (graphIntents.length >= 3) {
      const blockedRatio = graphIntents.filter(i => i.status === "blocked").length / graphIntents.length;
      if (blockedRatio > 0.3) {
        patterns.push({
          pattern_type: "stale_graph",
          severity: "medium",
          description: `Graph distillation intents have a ${(blockedRatio * 100).toFixed(0)}% block rate.`,
          evidence: { blocked_ratio: parseFloat(blockedRatio.toFixed(3)), total: graphIntents.length }
        });
      }
    }

    return patterns;
  }

  /**
   * Sequence planned steps across future runs based on patterns and bundles.
   * Order: cleanup → stabilize → optimize/redesign
   */
  public sequenceSteps(
    patterns: DetectedPattern[],
    bundles: IntentBundleArtifact[],
    intents: AmbIntentArtifact[]
  ): PlannedIntent[] {
    const planned: PlannedIntent[] = [];
    let step = 1;

    // Phase 1: Graph cleanup (if drift or stale graph patterns detected)
    const hasDrift = patterns.some(p => p.pattern_type === "recurring_drift" || p.pattern_type === "stale_graph");
    const graphBundle = bundles.find(b => b.bundle_type === "graph_cleanup");
    if (hasDrift || graphBundle) {
      planned.push({
        step: step++,
        intent_type: "graph_distillation",
        target_domains: { ckg_graph: true },
        justification: hasDrift
          ? "Address recurring drift by compressing stale CKG nodes."
          : "Scheduled graph entropy reduction.",
        expected_metrics: graphBundle?.estimated_impact || { graph_entropy_reduction: 0.1 }
      });
    }

    // Phase 2: MAS stabilization (if instability detected)
    const hasInstability = patterns.some(p => p.pattern_type === "persistent_mas_instability");
    const masBundle = bundles.find(b => b.bundle_type === "mas_stability");
    if (hasInstability || masBundle) {
      planned.push({
        step: step++,
        intent_type: "mas_stability",
        target_domains: { mas_topology: true },
        justification: hasInstability
          ? "Resolve persistent MAS instability through routing optimization."
          : "Scheduled MAS topology audit.",
        expected_metrics: masBundle?.estimated_impact || { consensus_improvement: 0.05 }
      });
    }

    // Phase 3: Planner tuning (if drift patterns exist and graph is cleaned)
    const plannerBundle = bundles.find(b => b.bundle_type === "planner_tuning");
    if (plannerBundle || hasDrift) {
      planned.push({
        step: step++,
        intent_type: "planner_tuning",
        target_domains: { cic_config: true },
        justification: "Refine planner heuristics after graph cleanup and MAS stabilization.",
        expected_metrics: plannerBundle?.estimated_impact || { planner_accuracy_gain: 0.1 }
      });
    }

    // Phase 4: Tenant redesign (if RL plateau or redesign bundle exists)
    const hasPlateau = patterns.some(p => p.pattern_type === "rl_plateau");
    const redesignBundle = bundles.find(b => b.bundle_type === "tenant_redesign");
    if (hasPlateau || redesignBundle) {
      planned.push({
        step: step++,
        intent_type: "rl_fusion",
        target_domains: { rl_fusion: true },
        justification: hasPlateau
          ? "Break RL metrics plateau with fresh tenant redesign cycle."
          : "Execute scheduled tenant redesign and outreach.",
        expected_metrics: redesignBundle?.estimated_impact || { conversion_rate_lift: 0.03 }
      });
    }

    // If nothing was planned from patterns/bundles, create a baseline plan from current intents
    if (planned.length === 0 && intents.length > 0) {
      // Take up to 3 highest-priority intents as planned steps
      const sorted = [...intents].sort((a, b) => b.priority_score - a.priority_score);
      for (const intent of sorted.slice(0, this.defaultHorizon)) {
        planned.push({
          step: step++,
          intent_type: intent.intent_type,
          target_domains: intent.target_domains as Record<string, boolean>,
          justification: intent.justification.summary,
          expected_metrics: intent.desired_outcomes.metrics
        });
      }
    }

    return planned.slice(0, this.defaultHorizon);
  }

  /**
   * Project aggregate impact across the planned steps.
   */
  private projectImpact(
    plannedIntents: PlannedIntent[],
    bundles: IntentBundleArtifact[],
    memory: AmbMemorySnapshot | null
  ): { drift_reduction: number; stability_gain: number; rl_value: number } {
    let driftReduction = 0;
    let stabilityGain = 0;
    let rlValue = 0;

    for (const planned of plannedIntents) {
      const metrics = planned.expected_metrics;
      driftReduction += metrics.graph_entropy_reduction || metrics.planner_accuracy_gain || 0;
      stabilityGain += metrics.consensus_improvement || 0;
      rlValue += metrics.conversion_rate_lift || 0;
    }

    // Historical adjustment: if memory shows improving trend, dampen projection
    if (memory && memory.drift_history.length >= 2) {
      const trend = memory.drift_history.slice(-3).map(d => d.tenant_drift_index ?? 0);
      const isImproving = trend.length >= 2 && trend[trend.length - 1] < trend[0];
      if (isImproving) {
        driftReduction *= 0.8; // conservative projection
      }
    }

    return {
      drift_reduction: parseFloat(driftReduction.toFixed(4)),
      stability_gain: parseFloat(stabilityGain.toFixed(4)),
      rl_value: parseFloat(rlValue.toFixed(4))
    };
  }

  /**
   * Collect policy constraints that apply to the current intent set.
   */
  private collectPolicyConstraints(intents: AmbIntentArtifact[]): string[] {
    const constraints = new Set<string>();

    for (const intent of intents) {
      if (intent.policy_alignment.forbidden_domain) constraints.add("forbidden_domain");
      if (intent.policy_alignment.operator_required) constraints.add("operator_required");
      if (intent.policy_alignment.lineage_required) constraints.add("lineage_required");
      if (intent.policy_alignment.rl_dependent) constraints.add("rl_dependent");
    }

    return Array.from(constraints);
  }
}
