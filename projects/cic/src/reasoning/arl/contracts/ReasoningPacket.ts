/**
 * projects/cic/src/reasoning/arl/contracts/ReasoningPacket.ts
 * Input contract for the Autonomous Reasoning Layer.
 */

export interface ArlCandidate {
  type: 'timeline' | 'audit' | 'narrative' | 'semantic' | 'crosslink';
  content: string;
  metadata: Record<string, unknown>;
}

export interface ArlContext {
  narrativeSpine: string;
  artifactsPlaneIndex: Record<string, unknown>;
  semanticMap: Record<string, unknown>;
  recentExpansions: ArlCandidate[];
  driftScore: number;
  stabilityMetrics: Record<string, unknown>;
}

export interface ReasoningPacket {
  candidate: ArlCandidate;
  context: ArlContext;
}
