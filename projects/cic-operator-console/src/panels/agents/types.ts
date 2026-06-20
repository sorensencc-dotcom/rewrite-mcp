// ── Agent Status ──────────────────────────────────────────────────────────────

export type AgentStatus = 'online' | 'degraded' | 'offline';

// ── Agent Summary (for AgentList) ──────────────────────────────────────────────

export interface AgentSummary {
  id: string;
  name: string;
  status: AgentStatus;
  lastExecution: string | null;
  costLast5m: number;
  heartbeat: {
    latencyMs: number;
    lastPulse: string;
  };
}

// ── Agent Detail (for AgentDetailView) ────────────────────────────────────────

export interface AgentMetadata {
  name: string;
  version: string;
  region: string;
  capabilities: string[];
}

export interface AgentHeartbeat {
  latencyMs: number;
  queueDepth: number;
  health: AgentStatus;
  lastPulse: string;
}

export interface CostPoint {
  timestamp: string;
  cost: number;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  inputHash: string;
  outputHash: string;
  driftScore: number;
  durationMs: number;
  error: string | null;
}

export interface ApprovalEntry {
  proposalId: string;
  vote: 'approve' | 'reject';
  timestamp: string;
  reason: string;
}

export interface SkillUsageEntry {
  skill: string;
  count: number;
  avgCost: number;
  successRate: number;
}

export interface AgentDetail {
  id: string;
  metadata: AgentMetadata;
  heartbeat: AgentHeartbeat;
  costTimeline: CostPoint[];
  executionLog: ExecutionLogEntry[];
  approvalHistory: ApprovalEntry[];
  skillUsage: SkillUsageEntry[];
}

// ── Status Summary ────────────────────────────────────────────────────────────

export interface StatusSummary {
  online: number;
  degraded: number;
  offline: number;
  total: number;
  lastUpdate: string;
}
