// File: projects/cic/src/cic/control-plane/instinct-proposer.ts | Date: 2026-06-01 | v1.5.0
import { SkillTelemetry, InstinctTelemetry } from "./telemetry-types.js";

export interface InstinctPatch {
  instinctName: string;
  baseVersion: string;
  proposedVersion: string;
  diff: any;          // YAML/JSON patch representation
  impactScore: number;
  rationale: string;
  metricsBefore?: {
    successRate: number;
    avgLatencyMs: number;
    avgDrift: number;
  };
  metricsAfter?: {
    successRate: number;
    avgLatencyMs: number;
    avgDrift: number;
  };
}

export class InstinctProposer {
  constructor(
    private skillEvents: SkillTelemetry[],
    private instinctEvents: InstinctTelemetry[]
  ) {}

  /**
   * Compares runs where instincts fired vs where they did not,
   * producing optimization patches with weighted impact scores.
   */
  public proposePatches(): InstinctPatch[] {
    const proposals: InstinctPatch[] = [];

    // Group skill events by runId to analyze individual runs
    const runSkills = new Map<string, SkillTelemetry[]>();
    for (const e of this.skillEvents) {
      const list = runSkills.get(e.runId) || [];
      list.push(e);
      runSkills.set(e.runId, list);
    }

    // Get list of unique instinct names that fired
    const uniqueInstincts = Array.from(new Set(this.instinctEvents.map(e => e.instinctName)));

    for (const instinctName of uniqueInstincts) {
      // Find all runs where this instinct fired
      const firedRuns = this.instinctEvents.filter(e => e.instinctName === instinctName);
      const firedRunIds = new Set(firedRuns.map(e => e.runId));

      // Separate runs into groups
      const runsWith: { success: boolean; latency: number; driftDelta: number }[] = [];
      const runsWithout: { success: boolean; latency: number; driftDelta: number }[] = [];

      for (const [runId, skills] of runSkills.entries()) {
        const isFired = firedRunIds.has(runId);
        const hasFailure = skills.some(s => s.outcome === "failure");
        const totalLatency = skills.reduce((acc, s) => acc + s.latencyMs, 0);

        // Find enriched instinct event to pull drift delta
        const instinctEvent = firedRuns.find(e => e.runId === runId);
        const drift = instinctEvent?.driftDelta !== undefined ? instinctEvent.driftDelta : 0.0;

        const profile = { success: !hasFailure, latency: totalLatency, driftDelta: drift };

        if (isFired) {
          runsWith.push(profile);
        } else {
          runsWithout.push(profile);
        }
      }

      // Propose optimizations if we have comparative data points
      if (runsWith.length > 0 && runsWithout.length > 0) {
        const successWith = runsWith.filter(r => r.success).length / runsWith.length;
        const successWithout = runsWithout.filter(r => r.success).length / runsWithout.length;

        const avgLatencyWith = runsWith.reduce((acc, r) => acc + r.latency, 0) / runsWith.length;
        const avgLatencyWithout = runsWithout.reduce((acc, r) => acc + r.latency, 0) / runsWithout.length;

        const avgDriftWith = runsWith.reduce((acc, r) => acc + r.driftDelta, 0) / runsWith.length;
        const avgDriftWithout = 0.0; // Baseline is always 0.0 reference

        // Instinct name version check: default to v0.3.0
        const matchingInstinct = this.instinctEvents.find(e => e.instinctName === instinctName);
        const baseVersion = matchingInstinct?.instinctVersion || "0.3.0";

        const metricsBefore = {
          successRate: successWithout,
          avgLatencyMs: avgLatencyWithout,
          avgDrift: avgDriftWithout
        };

        const metricsAfter = {
          successRate: successWith,
          avgLatencyMs: avgLatencyWith,
          avgDrift: avgDriftWith
        };

        // Case A: Instinct yields clear positive performance, success, or drift improvements -> Widen!
        if (successWith >= successWithout && (avgLatencyWith < avgLatencyWithout || avgDriftWith < 0)) {
          // Weighted impact score: 50% success delta, 30% latency reduction, 20% drift reduction
          const deltaSuccess = successWith - successWithout;
          const deltaLatency = Math.max(0, avgLatencyWithout - avgLatencyWith);
          const deltaDrift = Math.max(0, -avgDriftWith);

          const successScore = deltaSuccess * 100 * 5; // 50 max points
          const latencyScore = deltaLatency * 0.1; // up to 30 points (e.g. 300ms reduction)
          const driftScore = deltaDrift * 100 * 4; // up to 20 points (e.g. -0.05 drift delta)

          const rawScore = 30 + successScore + latencyScore + driftScore;
          const impactScore = Math.round(Math.min(95, Math.max(30, rawScore)));

          proposals.push({
            instinctName,
            baseVersion,
            proposedVersion: this.bumpMinor(baseVersion),
            diff: {
              trigger: {
                when: {
                  source_format_in: ["ris", "pdf", "xml"]
                }
              }
            },
            impactScore,
            rationale: `Instinct '${instinctName}' successfully improves pipeline metrics. Success Rate: ${(successWith * 100).toFixed(0)}% vs ${(successWithout * 100).toFixed(0)}%. Avg Latency: ${avgLatencyWith.toFixed(0)}ms vs ${avgLatencyWithout.toFixed(0)}ms. Drift reduction delta: ${avgDriftWith.toFixed(3)}. Recommend widening triggering format scope to XML.`,
            metricsBefore,
            metricsAfter
          });
        }
        // Case B: Instinct yields degraded success, latency penalty, or drift penalty -> Narrow trigger!
        else if (successWith < successWithout || (avgLatencyWith > avgLatencyWithout && avgDriftWith > 0)) {
          const deltaSuccess = successWithout - successWith;
          const deltaLatency = Math.max(0, avgLatencyWith - avgLatencyWithout);
          const deltaDrift = Math.max(0, avgDriftWith);

          const successScore = deltaSuccess * 100 * 5;
          const latencyScore = deltaLatency * 0.1;
          const driftScore = deltaDrift * 100 * 4;

          const rawScore = 30 + successScore + latencyScore + driftScore;
          const impactScore = Math.round(Math.min(95, Math.max(30, rawScore)));

          proposals.push({
            instinctName,
            baseVersion,
            proposedVersion: this.bumpMinor(baseVersion),
            diff: {
              logic: {
                routing_policy: {
                  if: "doc.source_format == 'ris' && doc.size_kb < 500"
                }
              }
            },
            impactScore,
            rationale: `Instinct '${instinctName}' introduces execution degradation. Success Rate: ${(successWith * 100).toFixed(0)}% vs ${(successWithout * 100).toFixed(0)}%. Avg Latency: ${avgLatencyWith.toFixed(0)}ms vs ${avgLatencyWithout.toFixed(0)}ms. Drift increase delta: +${avgDriftWith.toFixed(3)}. Recommend narrowing triggering logic.`,
            metricsBefore,
            metricsAfter
          });
        }
      }
    }

    // Default analytical fallback degradation search for individual slow skills
    const skillStats = new Map<string, { totalLatency: number; count: number; failures: number }>();
    for (const event of this.skillEvents) {
      const stats = skillStats.get(event.skillName) || { totalLatency: 0, count: 0, failures: 0 };
      stats.totalLatency += event.latencyMs;
      stats.count += 1;
      if (event.outcome === "failure") {
        stats.failures += 1;
      }
      skillStats.set(event.skillName, stats);
    }

    for (const [skillName, stats] of skillStats.entries()) {
      const avgLatency = stats.totalLatency / stats.count;
      const failureRate = stats.failures / stats.count;

      if (avgLatency > 2000 || failureRate > 0.15) {
        proposals.push({
          instinctName: `avoid_degraded_${skillName}`,
          baseVersion: "0.0.0",
          proposedVersion: "0.1.0",
          diff: {
            routing_policy: {
              avoid_skills: [skillName]
            }
          },
          impactScore: avgLatency > 2000 ? 95 : 65,
          rationale: `Skill '${skillName}' exhibits high degradation. Avg Latency: ${avgLatency.toFixed(1)}ms. Failure Rate: ${(failureRate * 100).toFixed(1)}%. Proposing avoidance instinct.`
        });
      }
    }

    return proposals;
  }

  private bumpMinor(version: string): string {
    const parts = version.split(".");
    if (parts.length === 3) {
      const minor = parseInt(parts[1], 10) + 1;
      return `${parts[0]}.${minor}.0`;
    }
    return "1.0.0";
  }
}
