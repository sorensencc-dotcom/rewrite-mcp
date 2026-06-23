import { SLOThreshold, SLOEvaluation } from "./slo-types.js";
export declare class SLOEvaluator {
    private windows;
    registerWindow(name: string, maxSize?: number): void;
    record(name: string, value: number): void;
    evaluate(threshold: SLOThreshold): SLOEvaluation;
}
