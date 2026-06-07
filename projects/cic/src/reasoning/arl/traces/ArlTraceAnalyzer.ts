/**
 * projects/cic/src/reasoning/arl/traces/ArlTraceAnalyzer.ts
 * High-level analysis utilities for ARL trace data.
 */

import { getArlTraceStore, ArlTraceRecord, ArlTraceQuery } from './ArlTraceStore.js';
import { ArlVerdictType } from '../contracts/ReasoningVerdict.js';

export class ArlTraceAnalyzer {
  /**
   * Get recent verdicts with optional filtering.
   */
  static getRecent(
    limit: number = 20,
    minCoherence?: number,
    verdict?: ArlVerdictType
  ): ArlTraceRecord[] {
    const store = getArlTraceStore();
    return store.query({
      limit,
      minCoherence,
      verdict
    });
  }

  /**
   * Get verdict success rate over time window (ms).
   */
  static getVerdictSuccessRate(windowMs: number = 3600000): number {
    const store = getArlTraceStore();
    const now = Date.now();

    const records = store.query({
      startTime: now - windowMs,
      endTime: now
    });

    if (records.length === 0) return 0;

    const accepted = records.filter(r => r.verdict === 'accept').length;
    return accepted / records.length;
  }

  /**
   * Get coherence trend analysis.
   */
  static getCoherenceTrend(intervalMs: number = 3600000): {
    timestamps: number[];
    averages: number[];
  } {
    const store = getArlTraceStore();
    const trend = store.coherenceTrend(intervalMs);

    const timestamps = Array.from(trend.keys()).sort();
    const averages = timestamps.map(ts => trend.get(ts)!.avg);

    return { timestamps, averages };
  }

  /**
   * Identify problematic candidates (low coherence, high drift).
   */
  static getProblematicCandidates(
    minCount: number = 1
  ): { type: string; count: number; avgCoherence: number; avgDrift: number }[] {
    const store = getArlTraceStore();
    const allRecords = store.query({ limit: 1000 });

    const byType = new Map<
      string,
      { sum: number; driftSum: number; count: number }
    >();

    allRecords.forEach(r => {
      const existing = byType.get(r.candidateType) || {
        sum: 0,
        driftSum: 0,
        count: 0
      };

      existing.sum += r.coherenceScore;
      existing.driftSum += r.driftImpact;
      existing.count++;

      byType.set(r.candidateType, existing);
    });

    return Array.from(byType.entries())
      .filter(([_, data]) => data.count >= minCount)
      .map(([type, data]) => ({
        type,
        count: data.count,
        avgCoherence: data.sum / data.count,
        avgDrift: data.driftSum / data.count
      }))
      .sort((a, b) => a.avgCoherence - b.avgCoherence);
  }

  /**
   * Get rejection analysis: why are verdicts being rejected?
   */
  static getRejectionAnalysis(): {
    totalRejections: number;
    byReason: Record<string, number>;
  } {
    const store = getArlTraceStore();
    const rejected = store.query({ verdict: 'reject', limit: 1000 });

    const byReason: Record<string, number> = {};

    rejected.forEach(r => {
      const narrative = r.narrativeImpact.toLowerCase();

      if (narrative.includes('drift')) {
        byReason['drift'] = (byReason['drift'] || 0) + 1;
      } else if (narrative.includes('alignment')) {
        byReason['alignment'] = (byReason['alignment'] || 0) + 1;
      } else if (narrative.includes('poor')) {
        byReason['poor_narrative'] = (byReason['poor_narrative'] || 0) + 1;
      } else {
        byReason['other'] = (byReason['other'] || 0) + 1;
      }
    });

    return {
      totalRejections: rejected.length,
      byReason
    };
  }

  /**
   * Compare two time periods for verdict distribution changes.
   */
  static comparePeriods(
    period1Ms: number = 3600000,
    period2Ms: number = 3600000
  ): {
    period1: { window: string; distribution: Record<string, number> };
    period2: { window: string; distribution: Record<string, number> };
  } {
    const store = getArlTraceStore();
    const now = Date.now();

    const stats1 = store.statistics({
      startTime: now - period1Ms * 2,
      endTime: now - period1Ms
    });

    const stats2 = store.statistics({
      startTime: now - period1Ms,
      endTime: now
    });

    return {
      period1: {
        window: `${period1Ms}ms ago`,
        distribution: stats1.verdictDistribution
      },
      period2: {
        window: `Now`,
        distribution: stats2.verdictDistribution
      }
    };
  }

  /**
   * Check system health: are verdicts becoming more or less coherent?
   */
  static getSystemHealth(): {
    coherenceHealth: 'good' | 'fair' | 'poor';
    driftHealth: 'good' | 'fair' | 'poor';
    overallHealth: 'good' | 'fair' | 'poor';
    metrics: {
      avgCoherence: number;
      avgDrift: number;
      successRate: number;
    };
  } {
    const store = getArlTraceStore();
    const stats = store.statistics({ limit: 100 });

    const coherenceHealth =
      stats.averageCoherence > 0.7
        ? 'good'
        : stats.averageCoherence > 0.4
          ? 'fair'
          : 'poor';

    const driftHealth =
      stats.averageDrift < 0.3
        ? 'good'
        : stats.averageDrift < 0.5
          ? 'fair'
          : 'poor';

    const acceptCount = stats.verdictDistribution.accept || 0;
    const totalCount = stats.totalRecords;
    const successRate = totalCount > 0 ? acceptCount / totalCount : 0;

    const overallHealth =
      coherenceHealth === 'good' && driftHealth === 'good'
        ? 'good'
        : coherenceHealth === 'poor' || driftHealth === 'poor'
          ? 'poor'
          : 'fair';

    return {
      coherenceHealth,
      driftHealth,
      overallHealth,
      metrics: {
        avgCoherence: stats.averageCoherence,
        avgDrift: stats.averageDrift,
        successRate
      }
    };
  }
}
