/**
 * projects/cic/src/reasoning/arl/traces/ArlTraceStore.ts
 * Persistent storage and retrieval of ARL reasoning verdicts and metrics.
 */
import { ReasoningVerdict, ArlVerdictType } from '../contracts/ReasoningVerdict';
import { ReasoningPacket } from '../contracts/ReasoningPacket';
export interface ArlTraceRecord {
    id: string;
    timestamp: number;
    candidateType: string;
    candidateContent: string;
    verdict: ArlVerdictType;
    confidence: number;
    coherenceScore: number;
    driftImpact: number;
    narrativeImpact: string;
    reasoning: string;
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
    timeRange: {
        start: number;
        end: number;
    };
}
/**
 * In-memory trace store for ARL verdicts.
 * In production, replace with persistent backend (Redis, PostgreSQL, etc.)
 */
export declare class ArlTraceStore {
    private records;
    private idCounter;
    record(packet: ReasoningPacket, verdict: ReasoningVerdict): ArlTraceRecord;
    query(criteria: ArlTraceQuery): ArlTraceRecord[];
    get(id: string): ArlTraceRecord | undefined;
    getLatest(limit?: number): ArlTraceRecord[];
    statistics(criteria?: ArlTraceQuery): ArlTraceStatistics;
    verdictTrend(intervalMs?: number): Map<number, Record<ArlVerdictType, number>>;
    coherenceTrend(intervalMs?: number): Map<number, {
        avg: number;
        count: number;
    }>;
    clear(): void;
    size(): number;
    private generateId;
}
export declare function getArlTraceStore(): ArlTraceStore;
export declare function resetArlTraceStore(): void;
//# sourceMappingURL=ArlTraceStore.d.ts.map