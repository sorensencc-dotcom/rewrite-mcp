import { PremiseExtractionResult } from './PremiseExtractor';

export interface Hypothesis {
  description: string;
  likelihood: number;
}

export function generateHypotheses(
  premises: PremiseExtractionResult
): Hypothesis[] {
  return [];
}
