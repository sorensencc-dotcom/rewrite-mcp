export interface ArlConfidence {
  weightedScore: number;   // 0–1
  factors: {
    coherence: number;
    semantic: number;
    temporal: number;
    causal: number;
    narrative: number;
  };
}
