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
export declare function getArlTrace(id: string): Promise<FormattedTraceStep[]>;
export declare function getArlComposite(id: string): Promise<CompositeScores | null>;
export declare function getArlDrift(id: string): Promise<DriftVector | null>;
export declare function storeArlTrace(id: string, trace: FormattedTraceStep[]): void;
export declare function storeArlComposite(id: string, composite: CompositeScores): void;
export declare function storeArlDrift(id: string, drift: DriftVector): void;
export {};
//# sourceMappingURL=arlStore.d.ts.map