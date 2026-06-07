// File: projects/cic/evolution/src/amb/ambMasHealthConfig.ts | Date: 2026-06-05 | v1.0.0

export interface MasHealthSnapshot {
  globalErrorRate: number;
  globalTimeoutRate: number;
  queueBacklogDepth: number;
  criticalAgentsHealth: number;
}

export const MAS_HEALTH_THRESHOLDS = {
  maxGlobalErrorRate: 0.05,
  maxTimeoutRate: 0.05,
  maxBacklogDepth: 100,
  criticalAgentsMinHealth: 0.9
};
