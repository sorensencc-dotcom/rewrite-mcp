export interface RunSummary {
  runId: string;
  timestamp: string; // ISO 8601

  // Core ARL metrics per expansion
  driftScore: number; // 0.0–1.0 (higher = more drift)
  contradictionScore: number; // 0.0–1.0 (higher = more contradictions)
  confidenceScore: number; // 0.0–1.0 (higher = more confident)
  compositeScore: number; // 0.0–1.0 (from 7.11)
}
