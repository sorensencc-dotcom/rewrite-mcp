export interface RunSummary {
  runId: string;
  timestamp: string;
  driftScore: number; // 0–1
  contradictionScore: number; // 0–1
  semanticScore: number; // 0–1
}
