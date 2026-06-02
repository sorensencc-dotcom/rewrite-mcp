export interface DriftImpact {
  semanticDrift: number;     // -1 to +1
  temporalDrift: number;     // -1 to +1
  narrativeDrift: number;    // -1 to +1
  causalDrift: number;       // -1 to +1
  compositeDrift: number;    // -1 to +1
  overall: number;           // -1 to +1
}
