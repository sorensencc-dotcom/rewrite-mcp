import { AmbMemorySnapshot, AmbMemoryIntentRecord } from "../types/ambStrategic.js";
import { AmbIntentArtifact } from "../types/ambIntent.js";
import { MasHealthSnapshot } from "./ambMasHealthConfig.js";
export declare class AmbMemoryStore {
    private memoryDir;
    constructor(baseDir?: string);
    /**
     * Load the most recent memory snapshot, or null if none exists.
     */
    loadLatestSnapshot(): AmbMemorySnapshot | null;
    /**
     * Record a completed AMB + Evolution run into the memory snapshot.
     * Merges new data with the latest snapshot (or creates a fresh one).
     */
    recordRun(params: {
        runId: string;
        intents: AmbIntentArtifact[];
        proposals: {
            proposalId: string;
            sourceIntentId?: string;
            applied: boolean;
            failed: boolean;
            impactMetrics?: Record<string, number>;
        }[];
        masSnapshot: MasHealthSnapshot;
        driftMetrics: {
            tenant_drift_index?: number;
            graph_entropy?: number;
        };
        rlMetrics?: {
            tenant_id: string;
            site_id: string;
            metrics: Record<string, number>;
        };
    }): AmbMemorySnapshot;
    /**
     * Write a memory snapshot to disk.
     */
    saveSnapshot(snapshot: AmbMemorySnapshot): void;
    /**
     * Get intent history, optionally limited to the last N entries.
     */
    getIntentHistory(lookback?: number): AmbMemoryIntentRecord[];
    /**
     * Compute the ratio of successfully applied proposals to total proposals.
     */
    getProposalSuccessRate(): number;
    /**
     * Get drift index values over the last N runs.
     */
    getDriftTrend(lookback?: number): number[];
    /**
     * Get MAS global error rate over the last N runs.
     */
    getMasStabilityTrend(lookback?: number): number[];
    /**
     * List all snapshot files in the memory directory.
     */
    private listSnapshotFiles;
}
//# sourceMappingURL=ambMemoryStore.d.ts.map