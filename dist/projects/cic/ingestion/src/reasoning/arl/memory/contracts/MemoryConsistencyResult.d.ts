export type MemoryViolationType = 'TEMPORAL_ORDER' | 'TEMPORAL_IMPOSSIBILITY' | 'CONTRADICTION' | 'MISSING_ENTITY' | 'MISSING_CONTEXT' | 'ATTRIBUTE_CONFLICT' | 'RELATIONSHIP_CONFLICT';
export interface MemoryViolation {
    entityId: string;
    type: MemoryViolationType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
    claimIndex?: number;
    suggestedResolution?: string;
}
export interface MemoryConsistencyResult {
    expansionId: string;
    alignmentScore: number;
    driftVector: number;
    violations: MemoryViolation[];
    missingContext: string[];
    temporalCoherence: number;
    narrativeCoherence: number;
    approvalRecommendation: 'auto_approve' | 'review' | 'reject';
    timestamp: string;
}
export interface MemoryValidationReport {
    result: MemoryConsistencyResult;
    detailedAnalysis: {
        temporalFindings: string[];
        contradictionFindings: string[];
        contextFindings: string[];
    };
    alternativeInterpretations?: Array<{
        description: string;
        alignmentScore: number;
    }>;
}
//# sourceMappingURL=MemoryConsistencyResult.d.ts.map