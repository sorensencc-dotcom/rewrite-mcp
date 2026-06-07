export interface CompositeReasoning {
  coherence: number;   // 0–1
  semantic: number;    // 0–1
  temporal: number;    // 0–1
  causal: number;      // 0–1
  narrative: number;   // 0–1
  overall: number;     // 0–1 (weighted composite)
}
