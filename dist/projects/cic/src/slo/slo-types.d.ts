export interface SLOThreshold {
    name: string;
    p95: number;
    maxErrorRate?: number;
    maxContradictionRate?: number;
    maxBundleSize?: number;
}
export interface SLOEvaluation {
    name: string;
    ok: boolean;
    value: number;
    threshold: number;
    reason?: string;
    timestamp: number;
}
export interface SLOWindow {
    samples: number[];
    timestamps: number[];
    maxSize: number;
}
//# sourceMappingURL=slo-types.d.ts.map