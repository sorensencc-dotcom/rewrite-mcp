// File: projects/cic/src/mee/mee-schema.ts | Date: 2026-06-03 | v1.0.0

export interface PhaseTriggerEvent {
  id: string;
  type: string; // "drift" | "capability_gap" | "roadmap_mismatch"
  source: string;
  details: Record<string, unknown>;
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
  triggerId: string;
  status: "pending" | "validated" | "rejected";
  filesCreated: string[];
  planSummary: string;
  timestamp: number;
}
