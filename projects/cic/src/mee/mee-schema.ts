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
  | "paused"
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
  priority?: number;
  dependsOnJobIds?: string[];
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

export type MeeAgentRole =
  | "planner"
  | "refactor"
  | "tester"
  | "docs"
  | "safety"
  | "research";

export interface MeeAgent {
  id: string;
  role: MeeAgentRole;
  name: string;
  createdAt: string;
}

export interface MeeAgentTask {
  id: string;
  agentId: string;
  jobId: string;
  runId?: string;
  createdAt: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
}

export interface MeeAgentExchange {
  id: string;
  taskId: string;
  agentId: string;
  createdAt: string;
  direction: "request" | "response";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MeeMemoryItem {
  id: string;
  createdAt: string;
  scope: "repo" | "job" | "run";
  repoId?: string;
  jobId?: string;
  runId?: string;
  tags: string[];
  summary: string;
  details: string;
}

export interface MeeAgentCritique {
  id: string;
  agentId: string;
  targetAgentId: string;
  issue: string;
  severity: "info" | "warn" | "error";
  suggestedFix: string;
  timestamp: string;
}

export interface MeeConsensusScore {
  proposalId: string;
  score: number;
  critiquesCount: number;
  passed: boolean;
}

export interface MeeConsensusResult {
  proposalId: string;
  decision: "ready" | "needs_revision" | "blocked";
  score: number;
  critiques: MeeAgentCritique[];
  cycles: number;
}

export interface ResearchFinding {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  severity: "low" | "medium" | "high" | "critical";
  category: "bug" | "bottleneck" | "drift" | "gap" | "opportunity";
  timestamp: number;
  status?: "draft" | "approved" | "rejected" | "promoted";
}

export interface MeePhaseSpec {
  id: string;
  phaseNumber: number;
  title: string;
  purpose: string;
  objectives: string[];
  tasks: string[];
  requiredCapabilities: string[];
  estimatedImpact: number; // 0-100
  feasibility: number;     // 0-100
  risk: number;            // 0-100
  alignment: number;       // 0-100
  score: number;           // calculated scoring
  status: "draft" | "proposed" | "approved" | "rejected" | "implemented";
  findings: ResearchFinding[];
  timestamp: number;
}

export interface RefactorOpportunity {
  id: string;
  file: string;
  type: "complexity" | "duplication" | "coupling" | "outdated_pattern";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedAction: string;
}

export interface MeeCapabilitySpec {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  suggestedAgents: string[];
  suggestedSubsystems: string[];
  status: "proposed" | "approved" | "rejected" | "integrated";
  timestamp: number;
}

export interface MeeMetaRule {
  id: string;
  name: string;
  description: string;
  heuristicType: "planner_decomposition" | "consensus_weight" | "scheduler_concurrency";
  weight: number; // 0.0 to 1.0
  conditions: string[];
  action: string;
  timestamp: number;
}

export function isResearchFinding(obj: any): obj is ResearchFinding {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    Array.isArray(obj.evidence) &&
    obj.evidence.every((e: any) => typeof e === "string") &&
    ["low", "medium", "high", "critical"].includes(obj.severity) &&
    ["bug", "bottleneck", "drift", "gap", "opportunity"].includes(obj.category) &&
    typeof obj.timestamp === "number" &&
    (obj.status === undefined || ["draft", "approved", "rejected", "promoted"].includes(obj.status))
  );
}

export function isMeePhaseSpec(obj: any): obj is MeePhaseSpec {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.phaseNumber === "number" &&
    typeof obj.title === "string" &&
    typeof obj.purpose === "string" &&
    Array.isArray(obj.objectives) &&
    obj.objectives.every((o: any) => typeof o === "string") &&
    Array.isArray(obj.tasks) &&
    obj.tasks.every((t: any) => typeof t === "string") &&
    Array.isArray(obj.requiredCapabilities) &&
    obj.requiredCapabilities.every((c: any) => typeof c === "string") &&
    typeof obj.estimatedImpact === "number" &&
    typeof obj.feasibility === "number" &&
    typeof obj.risk === "number" &&
    typeof obj.alignment === "number" &&
    typeof obj.score === "number" &&
    ["draft", "proposed", "approved", "rejected", "implemented"].includes(obj.status) &&
    Array.isArray(obj.findings) &&
    obj.findings.every(isResearchFinding) &&
    typeof obj.timestamp === "number"
  );
}

export function isMeeMetaRule(obj: any): obj is MeeMetaRule {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    ["planner_decomposition", "consensus_weight", "scheduler_concurrency"].includes(obj.heuristicType) &&
    typeof obj.weight === "number" &&
    obj.weight >= 0.0 &&
    obj.weight <= 1.0 &&
    Array.isArray(obj.conditions) &&
    obj.conditions.every((c: any) => typeof c === "string") &&
    typeof obj.action === "string" &&
    typeof obj.timestamp === "number"
  );
}
export function isRefactorInsight(obj: any): obj is RefactorInsight {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.id === "string" &&
    typeof obj.file === "string" &&
    ["complexity", "duplication", "dead_code", "unused_import", "long_function", "large_module", "drift", "style", "architecture"].includes(obj.type) &&
    typeof obj.message === "string" &&
    ["low", "medium", "high", "critical"].includes(obj.severity) &&
    (obj.location === undefined || (typeof obj.location === "object" && typeof obj.location.startLine === "number" && typeof obj.location.endLine === "number"))
  );
}
