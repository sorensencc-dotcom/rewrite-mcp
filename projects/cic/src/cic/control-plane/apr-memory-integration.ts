/**
 * apr-memory-integration.ts
 * Phase 23.4 — APR ↔ Memory Integration
 * Provides historical context and failure analysis for Autonomous Planner recommendations
 */

import { MemorySubstrate } from "../../../memory/memory-substrate";

export interface HistoricalContext {
  successRate: number;
  failureCount: number;
  failureClusters: Array<{ pattern: string; count: number }>;
  recommendedApproaches: string[];
  riskFactors: string[];
}

export class AprMemoryIntegration {
  constructor(private substrate: MemorySubstrate) {}

  /**
   * Analyze memory to extract historical planning context
   * Used by AutonomousPlanner to inform task recommendations
   */
  async getHistoricalContext(): Promise<HistoricalContext> {
    const allEvents = await this.substrate.query({});

    // Extract task execution events (or docs.build, sandbox.decision, etc.)
    const taskEvents = allEvents.filter(e =>
      e.type === "docs.build" || e.type === "sandbox.decision" || e.type === "task.execution"
    );

    if (taskEvents.length === 0) {
      return {
        successRate: 1.0,
        failureCount: 0,
        failureClusters: [],
        recommendedApproaches: [],
        riskFactors: []
      };
    }

    // Success rate calculation
    const successes = taskEvents.filter(e => (e.payload as any)?.ok !== false).length;
    const successRate = taskEvents.length > 0 ? successes / taskEvents.length : 0;

    // Failure clustering
    const failureEvents = taskEvents.filter(e => (e.payload as any)?.ok === false);
    const failureClusters: Record<string, number> = {};
    for (const evt of failureEvents) {
      const pattern = (evt.payload as any)?.error_type || "unknown";
      failureClusters[pattern] = (failureClusters[pattern] || 0) + 1;
    }

    const failureClusterArray = Object.entries(failureClusters)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);

    // Risk factors based on memory trends
    const riskFactors: string[] = [];
    if (successRate < 0.7) riskFactors.push("LOW_SUCCESS_RATE");
    if (failureEvents.length > 5) riskFactors.push("REPEATED_FAILURES");

    const driftEvents = allEvents.filter(
      e => e.type === "sandbox.decision" && (e.payload as any)?.similarity < 0.85
    );
    if (driftEvents.length > 3) riskFactors.push("PROMPT_DRIFT_DETECTED");

    // Recommended approaches based on successful patterns
    const recommendedApproaches: string[] = [];
    if (successRate > 0.8) recommendedApproaches.push("FOLLOW_PROVEN_PATTERN");
    if (failureClusterArray.length > 0) {
      recommendedApproaches.push(`AVOID_${failureClusterArray[0].pattern.toUpperCase()}`);
    }
    if (driftEvents.length === 0) recommendedApproaches.push("MAINTAIN_CURRENT_PROMPT");

    return {
      successRate,
      failureCount: failureEvents.length,
      failureClusters: failureClusterArray,
      recommendedApproaches,
      riskFactors
    };
  }

  /**
   * Extract memory-based skill recommendations
   * Which skills have succeeded most frequently in this context
   */
  async getSkillRecommendations(): Promise<Array<{ skillId: string; successRate: number; useCount: number }>> {
    const allEvents = await this.substrate.query({ event_type: "skill.execution" as any });

    const skillStats: Record<string, { successes: number; total: number }> = {};

    for (const evt of allEvents) {
      const skillId = (evt.payload as any)?.skill_id || "unknown";
      const ok = (evt.payload as any)?.ok !== false;

      if (!skillStats[skillId]) {
        skillStats[skillId] = { successes: 0, total: 0 };
      }

      skillStats[skillId].total += 1;
      if (ok) skillStats[skillId].successes += 1;
    }

    return Object.entries(skillStats)
      .map(([skillId, stats]) => ({
        skillId,
        successRate: stats.total > 0 ? stats.successes / stats.total : 0,
        useCount: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get task failure patterns to avoid
   */
  async getFailurePatterns(): Promise<Array<{ pattern: string; count: number; lastOccurrence: string }>> {
    const allEvents = await this.substrate.query({});
    const failureEvents = allEvents.filter(e => (e.payload as any)?.ok === false);

    const patterns: Record<string, { count: number; lastOccurrence: string }> = {};

    for (const evt of failureEvents) {
      const pattern = (evt.payload as any)?.error_type || "unknown";
      if (!patterns[pattern]) {
        patterns[pattern] = { count: 0, lastOccurrence: "" };
      }
      patterns[pattern].count += 1;
      patterns[pattern].lastOccurrence = evt.timestamp;
    }

    return Object.entries(patterns)
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        lastOccurrence: data.lastOccurrence
      }))
      .sort((a, b) => b.count - a.count);
  }
}
