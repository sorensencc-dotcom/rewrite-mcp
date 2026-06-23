import { PremiseExtractionResult } from './PremiseExtractor';
export interface Hypothesis {
    description: string;
    likelihood: number;
}
export declare function generateHypotheses(premises: PremiseExtractionResult): Hypothesis[];
