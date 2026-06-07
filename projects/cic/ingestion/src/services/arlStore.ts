import { FormattedTraceStep } from '../reasoning/arl/engine/ReasoningTraceFormatter';

interface CompositeScores {
  coherence: number;
  semantic: number;
  temporal: number;
  causal: number;
  narrative: number;
  overall: number;
}

interface DriftVector {
  semanticDrift: number;
  temporalDrift: number;
  narrativeDrift: number;
  causalDrift: number;
  compositeDrift: number;
  overall: number;
}

// Stub implementations — replace with real persistence/retrieval
const traceCache = new Map<string, FormattedTraceStep[]>();
const compositeCache = new Map<string, CompositeScores>();
const driftCache = new Map<string, DriftVector>();

export async function getArlTrace(id: string): Promise<FormattedTraceStep[]> {
  return traceCache.get(id) ?? [];
}

export async function getArlComposite(id: string): Promise<CompositeScores | null> {
  return compositeCache.get(id) ?? null;
}

export async function getArlDrift(id: string): Promise<DriftVector | null> {
  return driftCache.get(id) ?? null;
}

export function storeArlTrace(id: string, trace: FormattedTraceStep[]): void {
  traceCache.set(id, trace);
}

export function storeArlComposite(id: string, composite: CompositeScores): void {
  compositeCache.set(id, composite);
}

export function storeArlDrift(id: string, drift: DriftVector): void {
  driftCache.set(id, drift);
}
