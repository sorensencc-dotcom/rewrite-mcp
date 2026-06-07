export interface CoherenceScore {
  score: number;
  details: string;
}

export interface SemanticAlignment {
  score: number;
  details: string;
}

export interface TemporalConsistency {
  score: number;
  details: string;
}

export interface CausalReasoning {
  score: number;
  details: string;
}

export interface NarrativeImpact {
  score: number;
  details: string;
}

export interface CompositeReasoning {
  score: number;
  details: string;
}

export interface ArlConfidence {
  score: number;
  details: string;
}

export interface DriftImpact {
  score: number;
  details: string;
}

export * from './ExpansionContext';
export * from './MemorySnapshot';
export * from './MemoryConsistencyResult';
export * from './RunSummary';
export * from './MultiRunAggregate';
export * from './AdversarialSignal';
export * from './AdversarialAnalysisResult';
export * from './OperatorFeedback';
export * from './FeedbackAdjustment';
export * from './ThresholdConfig';
export * from './GovernanceSignal';
export * from './HealthMetrics';
export * from './Weights';
export * from './IntrospectionTrace';
export * from './StabilityPlane';
export * from './RuntimeOptimization';
export * from './ARLv2Spec';
export * from './ARLv2Implementation';
export * from './DistributedReasoning';
export * from './AutonomousMode';
