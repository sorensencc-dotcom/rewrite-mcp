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

export interface ValidationIssue {
  type: string;
  message: string;
}

export interface PhaseValidationReport {
  passed: boolean;
  compilePassed: boolean;
  testsPassed: boolean;
  driftPassed: boolean;
  errors: string[];
  issues?: ValidationIssue[];
}

export interface RefactorInsight {
  id: string;
  file: string;
  type:
    | "complexity"
    | "duplication"
    | "dead_code"
    | "unused_import"
    | "long_function"
    | "large_module"
    | "drift"
    | "style"
    | "architecture";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  location?: {
    startLine: number;
    endLine: number;
  };
  metadata?: Record<string, unknown>;
}

export interface RefactorPlan {
  insights: RefactorInsight[];
  patches: PhasePatch[];
  summary: string;
}

export interface PhaseProposal {
  id: string;
  title: string;
  trigger?: MeeTriggerEvent;
  status: "pending" | "validated" | "rejected" | "applied" | "proposed" | "planned";
  filesCreated: string[];
  planSummary: string;
  timestamp: number;
  validationReport?: PhaseValidationReport;
  refactorPlan?: RefactorPlan;
  safetyReport?: MeeSafetyReport;
  sandboxResult?: MeeSandboxResult;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  type: "feature" | "refactor" | "fix" | "doc" | "test" | "infra";
  dependsOn: string[];
}

export interface PlanTree {
  rootRequest: string;
  tasks: PlanTask[];
  summary: string;
}

export type MeeRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export interface MeeCheckpoint {
  id: string;
  runId: string;
  createdAt: string;
  label?: string;
  data: Record<string, unknown>;
}

export interface MeeRun {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: MeeRunStatus;
  planId?: string;
  proposalIds: string[];
  currentStepIndex: number;
  totalSteps: number;
  lastCheckpointId?: string;
  error?: {
    message: string;
    code?: string;
  };
}

export type MeeRiskLevel = "low" | "medium" | "high" | "critical";

export interface MeeSafetyReport {
  passed: boolean;
  riskLevel: MeeRiskLevel;
  issues: string[];
}

export interface MeeSandboxResult {
  passed: boolean;
  compilePassed: boolean;
  testsPassed: boolean;
  output: string;
}

export type MeeAutonomousJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface MeeAutonomousJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: MeeAutonomousJobStatus;
  request: string;
  planId?: string;
  runId?: string;
  proposalIds: string[];
  parentJobId?: string;
  planningMode?: MeePlanningMode;
  error?: {
    message: string;
    code?: string;
  };
}

export type MeePlanningMode = "deterministic" | "llm" | "hybrid";

export interface MeeRunFailureContext {
  runId: string;
  jobId?: string;
  createdAt: string;
  failingProposalIds: string[];
  errorCode?: string;
  errorMessage: string;
  safetyReports?: unknown;
  sandboxOutput?: {
    buildOutput: string;
    testOutput: string;
    errors?: string[];
  };
}

export interface MeeHealingPlan {
  id: string;
  parentJobId: string;
  createdAt: string;
  summary: string;
  suggestedTasks: {
    title: string;
    description: string;
    type: string;
  }[];
}


