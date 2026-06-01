/**
 * projects/cic/src/reasoning/arl/contracts/ReasoningVerdict.ts
 * Output contract for the Autonomous Reasoning Layer.
 */

export type ArlVerdictType = 'accept' | 'reject' | 'revise';

export interface ReasoningStep {
  step: string;
  evidence: string;
  score: number;
}

export interface ReasoningVerdict {
  verdict: ArlVerdictType;
  confidence: number;
  reasoningTrace: ReasoningStep[];
  coherenceScore: number;
  driftImpact: number;
  narrativeImpact: string;
  recommendedAction: ArlVerdictType;
}
