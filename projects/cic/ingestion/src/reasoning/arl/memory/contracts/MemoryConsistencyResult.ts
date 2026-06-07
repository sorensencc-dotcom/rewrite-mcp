export type MemoryViolationType =
  | 'TEMPORAL_ORDER'
  | 'TEMPORAL_IMPOSSIBILITY'
  | 'CONTRADICTION'
  | 'MISSING_ENTITY'
  | 'MISSING_CONTEXT'
  | 'ATTRIBUTE_CONFLICT'
  | 'RELATIONSHIP_CONFLICT';

export interface MemoryViolation {
  entityId: string;
  type: MemoryViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  claimIndex?: number; // which claim in expansion caused this
  suggestedResolution?: string;
}

export interface MemoryConsistencyResult {
  expansionId: string;
  alignmentScore: number; // 0.0–1.0 (how well expansion fits existing memory)
  driftVector: number; // -1.0 to +1.0 (change from previous alignment)
  violations: MemoryViolation[];
  missingContext: string[]; // Information needed to fully validate
  temporalCoherence: number; // 0.0-1.0 (how well events are ordered)
  narrativeCoherence: number; // 0.0-1.0 (how well claims fit narrative)
  approvalRecommendation: 'auto_approve' | 'review' | 'reject';
  timestamp: string; // ISO 8601 when validation was run
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
