import { ThresholdConfig, ThresholdResult } from '../contracts/ThresholdConfig';
export declare class ThresholdModel {
    private config;
    constructor(config?: Partial<ThresholdConfig>);
    evaluate(input: {
        compositeReasoning: number;
        confidence: number;
        driftMagnitude: number;
        contradictionSeverity: number;
    }): ThresholdResult;
    private mapFailureToCode;
}
//# sourceMappingURL=ThresholdModel.d.ts.map