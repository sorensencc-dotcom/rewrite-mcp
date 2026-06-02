import { DriftImpact } from '../contracts/index';
import { DEFAULT_WEIGHTS } from './WeightingModel';

export interface DriftVector {
  semanticDrift: number;
  temporalDrift: number;
  narrativeDrift: number;
  causalDrift: number;
  compositeDrift: number;
  overall: number;
}

export function calculateDriftImpact(driftInput: {
  semanticDrift?: number;
  temporalDrift?: number;
  narrativeDrift?: number;
  causalDrift?: number;
  compositeDrift?: number;
}): DriftImpact & DriftVector {
  const semanticDrift = driftInput.semanticDrift || 0;
  const temporalDrift = driftInput.temporalDrift || 0;
  const narrativeDrift = driftInput.narrativeDrift || 0;
  const causalDrift = driftInput.causalDrift || 0;
  const compositeDrift = driftInput.compositeDrift || 0;

  const overall =
    semanticDrift * DEFAULT_WEIGHTS.semantic +
    temporalDrift * DEFAULT_WEIGHTS.temporal +
    narrativeDrift * DEFAULT_WEIGHTS.narrative +
    causalDrift * DEFAULT_WEIGHTS.causal +
    compositeDrift * 0.2;

  return {
    score: overall,
    details: `Weighted drift impact: semantic=${semanticDrift.toFixed(2)}, temporal=${temporalDrift.toFixed(2)}, narrative=${narrativeDrift.toFixed(2)}, causal=${causalDrift.toFixed(2)}, composite=${compositeDrift.toFixed(2)}`,
    semanticDrift,
    temporalDrift,
    narrativeDrift,
    causalDrift,
    compositeDrift,
    overall,
  };
}
