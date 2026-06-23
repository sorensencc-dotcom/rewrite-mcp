export interface MasHealthSnapshot {
    globalErrorRate: number;
    globalTimeoutRate: number;
    queueBacklogDepth: number;
    criticalAgentsHealth: number;
}
export declare const MAS_HEALTH_THRESHOLDS: {
    maxGlobalErrorRate: number;
    maxTimeoutRate: number;
    maxBacklogDepth: number;
    criticalAgentsMinHealth: number;
};
//# sourceMappingURL=ambMasHealthConfig.d.ts.map