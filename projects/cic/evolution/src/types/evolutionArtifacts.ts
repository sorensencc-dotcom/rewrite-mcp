// File: projects/cic/evolution/src/types/evolutionArtifacts.ts | Date: 2026-06-05 | v1.0.0

export interface AuditAnomaly {
  id: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AuditReport {
  runId: string;
  timestamp: number;
  systemDrift: number;
  anomalies: AuditAnomaly[];
}

export interface ProposalPatch {
  path: string;
  type: "create" | "modify";
  content: string;
}

export interface EvolutionProposal {
  proposalId: string;
  title: string;
  patches: ProposalPatch[];
  sourceAnomaly?: string;
  pruneActions?: any[];
  fusionTrigger?: any;
}

export interface ProposalsReport {
  runId: string;
  proposals: EvolutionProposal[];
}
