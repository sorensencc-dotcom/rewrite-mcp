export interface SubsystemProposal {
  name: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  precedingPhase?: string;
}

export interface WeightingModelV2 {
  version: '2.0';
  subsystemWeights: Record<string, number>;
  adaptiveWeighting: boolean;
  learningRate: number;
  description: string;
}

export interface DriftModelV2 {
  version: '2.0';
  vectorDimensions: number;
  decayFactor: number;
  anomalyThreshold: number;
  description: string;
}

export interface GovernanceModelV2 {
  version: '2.0';
  autonomousThresholds: Record<string, number>;
  escalationRules: string[];
  operatorOverrideAllowed: boolean;
  description: string;
}

export interface OperatorUXV2 {
  version: '2.0';
  dashboardLayout: string[];
  alertingStrategy: string;
  feedbackChannels: string[];
  description: string;
}

export interface ARLv2Spec {
  id: string;
  timestamp: string;
  subsystemProposals: SubsystemProposal[];
  weightingModelV2: WeightingModelV2;
  driftModelV2: DriftModelV2;
  governanceModelV2: GovernanceModelV2;
  operatorUXV2: OperatorUXV2;
  status: 'draft' | 'review' | 'approved';
}
