import { ArlInput, Verdict } from '../src/reasoning/arl/index';
interface StabilityReport {
    timestamp: string;
    arl: {
        verdict: Verdict;
        trace: any[];
        weights: {
            coherence: number;
            semantic: number;
            temporal: number;
            causal: number;
            narrative: number;
        };
    };
}
export declare function generateStabilityReport(arlInput: ArlInput): Promise<StabilityReport>;
export declare function reportToOperatorDashboard(arlInput: ArlInput): Promise<void>;
export {};
//# sourceMappingURL=generate-stability-report.d.ts.map