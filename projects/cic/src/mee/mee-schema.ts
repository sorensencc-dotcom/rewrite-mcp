// File: projects/cic/src/mee/mee-schema.ts | Date: 2026-06-03 | v1.1.0

export interface MeeTriggerEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface PhasePlan {
  phaseNumber: number;
  title: string;
  objectives: string[];
  tasks: string[];
}

export interface PhasePatch {
  path: string;
  type: "create" | "modify";
  content: string;
}

export interface PhasePatchSet {
  proposalId: string;
  patches: PhasePatch[];
}

export interface PhaseValidationReport {
  passed: boolean;
  compilePassed: boolean;
  testsPassed: boolean;
  driftPassed: boolean;
  errors: string[];
}

export interface PhaseProposal {
  id: string;
  title: string;
  trigger: MeeTriggerEvent;
  status: "pending" | "validated" | "rejected" | "applied";
  filesCreated: string[];
  planSummary: string;
  timestamp: number;
}
