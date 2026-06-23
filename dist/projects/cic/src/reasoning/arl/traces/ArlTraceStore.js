"use strict";
/**
 * projects/cic/src/reasoning/arl/traces/ArlTraceStore.ts
 * Persistent storage and retrieval of ARL reasoning verdicts and metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArlTraceStore = void 0;
exports.getArlTraceStore = getArlTraceStore;
exports.resetArlTraceStore = resetArlTraceStore;
/**
 * In-memory trace store for ARL verdicts.
 * In production, replace with persistent backend (Redis, PostgreSQL, etc.)
 */
class ArlTraceStore {
    constructor() {
        this.records = new Map();
        this.idCounter = 0;
    }
    record(packet, verdict) {
        const id = this.generateId();
        const now = Date.now();
        const record = {
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
    query(criteria) {
        let results = Array.from(this.records.values());
        if (criteria.startTime !== undefined) {
            results = results.filter(r => r.timestamp >= criteria.startTime);
        }
        if (criteria.endTime !== undefined) {
            results = results.filter(r => r.timestamp <= criteria.endTime);
        }
        if (criteria.verdict !== undefined) {
            results = results.filter(r => r.verdict === criteria.verdict);
        }
        if (criteria.minCoherence !== undefined) {
            results = results.filter(r => r.coherenceScore >= criteria.minCoherence);
        }
        if (criteria.maxDrift !== undefined) {
            results = results.filter(r => r.driftImpact <= criteria.maxDrift);
        }
        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);
        if (criteria.limit !== undefined) {
            results = results.slice(0, criteria.limit);
        }
        return results;
    }
    get(id) {
        return this.records.get(id);
    }
    getLatest(limit = 10) {
        return Array.from(this.records.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    statistics(criteria) {
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
        const distribution = {
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
    verdictTrend(intervalMs = 3600000) {
        const trends = new Map();
        Array.from(this.records.values()).forEach(record => {
            const bucket = Math.floor(record.timestamp / intervalMs) * intervalMs;
            if (!trends.has(bucket)) {
                trends.set(bucket, { accept: 0, reject: 0, revise: 0 });
            }
            const bucketData = trends.get(bucket);
            bucketData[record.verdict]++;
        });
        return trends;
    }
    coherenceTrend(intervalMs = 3600000) {
        const trends = new Map();
        Array.from(this.records.values()).forEach(record => {
            const bucket = Math.floor(record.timestamp / intervalMs) * intervalMs;
            if (!trends.has(bucket)) {
                trends.set(bucket, { sum: 0, count: 0 });
            }
            const bucketData = trends.get(bucket);
            bucketData.sum += record.coherenceScore;
            bucketData.count++;
        });
        const result = new Map();
        trends.forEach((value, key) => {
            result.set(key, {
                avg: value.sum / value.count,
                count: value.count
            });
        });
        return result;
    }
    clear() {
        this.records.clear();
    }
    size() {
        return this.records.size;
    }
    generateId() {
        return `arl-${++this.idCounter}-${Date.now()}`;
    }
}
exports.ArlTraceStore = ArlTraceStore;
// Global singleton instance
let instance = null;
function getArlTraceStore() {
    if (!instance) {
        instance = new ArlTraceStore();
    }
    return instance;
}
function resetArlTraceStore() {
    instance = null;
}
//# sourceMappingURL=ArlTraceStore.js.map