// File: projects/cic/src/cic/control-plane/telemetry-types.ts | Date: 2026-06-01 | v1.5.0

export type Outcome = "success" | "partial" | "failure";

export interface SkillTelemetry {
  runId: string;
  pipeline: string;
  stage: string;
  skillName: string;
  skillVersion: string;
  tenantId: string;
  region: string;

  startedAt: string;   // ISO
  finishedAt: string;  // ISO
  latencyMs: number;

  inputSizeBytes: number;
  outputSizeBytes: number | null;

  outcome: Outcome;
  errorType?: string;          // e.g. 'timeout', 'validation_error', 'llm_error'
  errorMessageSnippet?: string;

  instinctName?: string;
  instinctVersion?: string;

  rulesEnforced: string[];     // rule names
  hooksFired: string[];        // hook names
}

export interface InstinctTelemetry {
  runId: string;
  pipeline: string;
  stage: string;

  instinctName: string;
  instinctVersion: string;

  tenantId: string;
  region: string;

  firedAt: string; // ISO

  skillsSelected: string[];
  skillsAvoided: string[];

  // Optional downstream properties
  pipelineOutcome?: Outcome;
  driftDelta?: number;   // + = more drift, - = less
  latencyDeltaMs?: number;
  costDelta?: number;    // abstract cost units
}
