/**
 * projects/cic/src/reasoning/arl/traces/ArlTraceStore.ts
 * Persistent storage and retrieval of ARL reasoning verdicts and metrics.
 */

import { ReasoningVerdict, ArlVerdictType } from '../contracts/ReasoningVerdict';
import { ReasoningPacket } from '../contracts/ReasoningPacket';

export interface ArlTraceRecord {
  id: string; // UUID
  timestamp: number; // Unix milliseconds
  candidateType: string;
  candidateContent: string;
  verdict: ArlVerdictType;
  confidence: number;
  coherenceScore: number;
  driftImpact: number;
  narrativeImpact: string;
  reasoning: string; // JSON-stringified reasoning trace
}

export interface ArlTraceQuery {
  startTime?: number;
  endTime?: number;
  verdict?: ArlVerdictType;
  minCoherence?: number;
  maxDrift?: number;
  limit?: number;
}

export interface ArlTraceStatistics {
  totalRecords: number;
  verdictDistribution: Record<ArlVerdictType, number>;
  averageCoherence: number;
  averageDrift: number;
  averageConfidence: number;
  timeRange: { start: number; end: number };
}

/**
 * In-memory trace store for ARL verdicts.
 * In production, replace with persistent backend (Redis, PostgreSQL, etc.)
 */
export class ArlTraceStore {
  private records: Map<string, ArlTraceRecord> = new Map();
  private idCounter = 0;

  record(packet: ReasoningPacket, verdict: ReasoningVerdict): ArlTraceRecord {
    const id = this.generateId();
    const now = Date.now();

    const record: ArlTraceRecord = {
      id,
      timestamp: now,
      candidateType: packet.candidate.type,
      candidateContent: packet.candidate.content.substring(0, 500),
      verdict: verdict.verdict,
      confidence: verdict.confidence,
      coherenceScore: verdict.coherenceScore,
      driftImpact: verdict.driftImpact,
      narrativeImpact: verdict.narrativeImpact,
      reasoning: JSON.stringify(verdict.reasoningTrace)
    };

    this.records.set(id, record);
    return record;
  }

  query(criteria: ArlTraceQuery): ArlTraceRecord[] {
    let results = Array.from(this.records.values());

    if (criteria.startTime !== undefined) {
      results = results.filter(r => r.timestamp >= criteria.startTime!);
    }

    if (criteria.endTime !== undefined) {
      results = results.filter(r => r.timestamp <= criteria.endTime!);
    }

    if (criteria.verdict !== undefined) {
      results = results.filter(r => r.verdict === criteria.verdict);
    }

    if (criteria.minCoherence !== undefined) {
      results = results.filter(r => r.coherenceScore >= criteria.minCoherence!);
    }

    if (criteria.maxDrift !== undefined) {
      results = results.filter(r => r.driftImpact <= criteria.maxDrift!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (criteria.limit !== undefined) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  get(id: string): ArlTraceRecord | undefined {
    return this.records.get(id);
  }

  getLatest(limit: number = 10): ArlTraceRecord[] {
    return Array.from(this.records.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  statistics(criteria?: ArlTraceQuery): ArlTraceStatistics {
    const records = criteria ? this.query(criteria) : Array.from(this.records.values());

    if (records.length === 0) {
      return {
        totalRecords: 0,
        verdictDistribution: {
          accept: 0,
          reject: 0,
          revise: 0
        },
        averageCoherence: 0,
        averageDrift: 0,
        averageConfidence: 0,
        timeRange: { start: 0, end: 0 }
      };
    }

    // Calculate verdict distribution
    const distribution: Record<ArlVerdictType, number> = {
      accept: 0,
      reject: 0,
      revise: 0
    };

    records.forEach(r => {
      distribution[r.verdict]++;
    });

    // Calculate averages
    const sumCoherence = records.reduce((sum, r) => sum + r.coherenceScore, 0);
    const sumDrift = records.reduce((sum, r) => sum + r.driftImpact, 0);
    const sumConfidence = records.reduce((sum, r) => sum + r.confidence, 0);

    const timestamps = records.map(r => r.timestamp);
    const timeRange = {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps)
    };

    return {
      totalRecords: records.length,
      verdictDistribution: distribution,
      averageCoherence: sumCoherence / records.length,
      averageDrift: sumDrift / records.length,
      averageConfidence: sumConfidence / records.length,
      timeRange
    };
  }

  verdictTrend(intervalMs: number = 3600000): Map<number, Record<ArlVerdictType, number>> {
    const trends = new Map<number, Record<ArlVerdictType, number>>();

    Array.from(this.records.values()).forEach(record => {
      const bucket = Math.floor(record.timestamp / intervalMs) * intervalMs;

      if (!trends.has(bucket)) {
        trends.set(bucket, { accept: 0, reject: 0, revise: 0 });
      }

      const bucketData = trends.get(bucket)!;
      bucketData[record.verdict]++;
    });

    return trends;
  }

  coherenceTrend(intervalMs: number = 3600000): Map<number, { avg: number; count: number }> {
    const trends = new Map<number, { sum: number; count: number }>();

    Array.from(this.records.values()).forEach(record => {
      const bucket = Math.floor(record.timestamp / intervalMs) * intervalMs;

      if (!trends.has(bucket)) {
        trends.set(bucket, { sum: 0, count: 0 });
      }

      const bucketData = trends.get(bucket)!;
      bucketData.sum += record.coherenceScore;
      bucketData.count++;
    });

    const result = new Map<number, { avg: number; count: number }>();
    trends.forEach((value, key) => {
      result.set(key, {
        avg: value.sum / value.count,
        count: value.count
      });
    });

    return result;
  }

  clear(): void {
    this.records.clear();
  }

  size(): number {
    return this.records.size;
  }

  private generateId(): string {
    return `arl-${++this.idCounter}-${Date.now()}`;
  }
}

// Global singleton instance
let instance: ArlTraceStore | null = null;

export function getArlTraceStore(): ArlTraceStore {
  if (!instance) {
    instance = new ArlTraceStore();
  }
  return instance;
}

export function resetArlTraceStore(): void {
  instance = null;
}
