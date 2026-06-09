/**
 * CIC Governance Packet Types
 * Phase 24.2: Evidence Vault Schema
 * Generated from JSON schemas
 */

/**
 * All valid packet types
 */
export type PacketType =
  | 'research'
  | 'plan'
  | 'implement'
  | 'validate'
  | 'record'
  | 'gate'
  | 'council'
  | 'evolution_step'
  | 'drift'
  | 'rollback';

/**
 * All valid CIC phases
 */
export type CICPhase =
  | 'discovery'
  | 'harvester'
  | 'orchestrate'
  | 'execution'
  | 'synthesize'
  | 'audit'
  | 'evolution';

/**
 * Policy context (active rails during packet generation)
 */
export interface PolicyContext {
  global?: string[];
  domain?: string[];
  phase?: string[];
}

/**
 * Common packet envelope (all packets have this structure)
 */
export interface PacketEnvelope {
  packet_id: string; // UUID
  packet_type: PacketType;
  run_id: string; // UUID
  agent_id: string;
  phase: CICPhase;
  timestamp: string; // ISO 8601
  parent_packet_ids?: string[]; // UUIDs
  policy_context?: PolicyContext;
  content: Record<string, unknown>; // Type-specific content
}

// ============================================================================
// RPI PACKETS
// ============================================================================

export interface ResearchPacketContent {
  goal: string;
  constraints: string[];
  queries?: string[];
  sources?: string[];
  selected_context?: string[];
  telemetry_summary?: {
    recent_runs?: string[];
    anomalies?: string[];
  };
}

export interface ResearchPacket extends PacketEnvelope {
  packet_type: 'research';
  content: ResearchPacketContent;
}

export interface PlanPacketContent {
  steps: string[];
  acceptance_criteria: string[];
  first_failing_test?: string;
  risk_assessment?: {
    risks?: string[];
    mitigations?: string[];
  };
  premortem_summary?: string;
}

export interface PlanPacket extends PacketEnvelope {
  packet_type: 'plan';
  content: PlanPacketContent;
}

export interface ImplementPacketContent {
  diffs: string[];
  commands: string[];
  artifacts?: string[];
  affected_resources?: string[];
}

export interface ImplementPacket extends PacketEnvelope {
  packet_type: 'implement';
  content: ImplementPacketContent;
}

export interface TestResult {
  test_id: string;
  status: 'pass' | 'fail' | 'skip' | 'error';
  details?: string;
}

export interface ValidatePacketContent {
  test_results: TestResult[];
  metrics?: {
    latency_ms?: number;
    error_rate?: number;
    resource_usage?: Record<string, unknown>;
  };
  gate_packets?: string[];
  council_packets?: string[];
  final_verdict: 'permit' | 'block' | 'revise';
}

export interface ValidatePacket extends PacketEnvelope {
  packet_type: 'validate';
  content: ValidatePacketContent;
}

export interface RecordPacketContent {
  learnings?: string[];
  decisions: string[];
  citations?: string[];
  impact?: {
    corpus_updates?: string[];
    policy_implications?: string[];
  };
}

export interface RecordPacket extends PacketEnvelope {
  packet_type: 'record';
  content: RecordPacketContent;
}

// ============================================================================
// GATE PACKETS
// ============================================================================

export type GateType = 'premortem' | 'vibe' | 'scenario' | 'policy';

export interface GateCheck {
  check_id: string;
  status: 'pass' | 'fail' | 'warn';
  details?: string;
}

export interface GatePacketContent {
  gate_id: GateType;
  run_id: string;
  phase?: 'orchestrate' | 'audit';
  result: 'pass' | 'fail' | 'warn';
  checks: GateCheck[];
  violations?: string[];
  timestamp?: string;
}

export interface GatePacket extends PacketEnvelope {
  packet_type: 'gate';
  content: GatePacketContent;
}

// ============================================================================
// COUNCIL PACKETS
// ============================================================================

export type VoteResult = 'permit' | 'block' | 'revise';

export interface CouncilVote {
  member_id: string;
  vote: VoteResult;
  rationale: string;
  confidence?: number; // 0-1
}

export interface CouncilPacketContent {
  council_id: string;
  run_id: string;
  votes: CouncilVote[];
  verdict: VoteResult;
  conditions?: string[];
  timestamp?: string;
}

export interface CouncilPacket extends PacketEnvelope {
  packet_type: 'council';
  content: CouncilPacketContent;
}

// ============================================================================
// EVOLUTION & SAFETY PACKETS
// ============================================================================

export interface EvolutionStepPacketContent {
  corpus_changes?: string[];
  policy_updates?: string[];
  decayed_packets?: string[];
  new_learnings?: string[];
}

export interface EvolutionStepPacket extends PacketEnvelope {
  packet_type: 'evolution_step';
  content: EvolutionStepPacketContent;
}

export type DriftType = 'behavioral' | 'policy' | 'data' | 'corpus';
export type DriftDetectionMethod = 'statistical' | 'heuristic' | 'council' | 'ground_truth';
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DriftAction = 'alert' | 'investigate' | 'rollback' | 'escalate';

export interface DriftPacketContent {
  drift_type: DriftType;
  detection_method?: DriftDetectionMethod;
  severity: DriftSeverity;
  impacted_areas?: string[];
  evidence?: string[];
  recommended_action?: DriftAction;
}

export interface DriftPacket extends PacketEnvelope {
  packet_type: 'drift';
  content: DriftPacketContent;
}

export interface RollbackPacketContent {
  snapshot_id?: string;
  invalidated_packets?: string[];
  reason: string;
  operator_override?: boolean;
  rerun_instructions?: {
    adjusted_parameters?: Record<string, unknown>;
    stricter_rails?: string[];
  };
}

export interface RollbackPacket extends PacketEnvelope {
  packet_type: 'rollback';
  content: RollbackPacketContent;
}

// ============================================================================
// UNION TYPE FOR ALL PACKETS
// ============================================================================

export type GovernancePacket =
  | ResearchPacket
  | PlanPacket
  | ImplementPacket
  | ValidatePacket
  | RecordPacket
  | GatePacket
  | CouncilPacket
  | EvolutionStepPacket
  | DriftPacket
  | RollbackPacket;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isResearchPacket(packet: GovernancePacket): packet is ResearchPacket {
  return packet.packet_type === 'research';
}

export function isPlanPacket(packet: GovernancePacket): packet is PlanPacket {
  return packet.packet_type === 'plan';
}

export function isImplementPacket(packet: GovernancePacket): packet is ImplementPacket {
  return packet.packet_type === 'implement';
}

export function isValidatePacket(packet: GovernancePacket): packet is ValidatePacket {
  return packet.packet_type === 'validate';
}

export function isRecordPacket(packet: GovernancePacket): packet is RecordPacket {
  return packet.packet_type === 'record';
}

export function isGatePacket(packet: GovernancePacket): packet is GatePacket {
  return packet.packet_type === 'gate';
}

export function isCouncilPacket(packet: GovernancePacket): packet is CouncilPacket {
  return packet.packet_type === 'council';
}

export function isEvolutionStepPacket(packet: GovernancePacket): packet is EvolutionStepPacket {
  return packet.packet_type === 'evolution_step';
}

export function isDriftPacket(packet: GovernancePacket): packet is DriftPacket {
  return packet.packet_type === 'drift';
}

export function isRollbackPacket(packet: GovernancePacket): packet is RollbackPacket {
  return packet.packet_type === 'rollback';
}

// ============================================================================
// PACKET BUILDERS (For convenience)
// ============================================================================

export class PacketBuilder {
  static research(
    run_id: string,
    agent_id: string,
    content: ResearchPacketContent,
    options?: { phase?: CICPhase; policy_context?: PolicyContext }
  ): ResearchPacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'research',
      run_id,
      agent_id,
      phase: options?.phase || 'discovery',
      timestamp: new Date().toISOString(),
      policy_context: options?.policy_context,
      content,
    };
  }

  static plan(
    run_id: string,
    agent_id: string,
    content: PlanPacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): PlanPacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'plan',
      run_id,
      agent_id,
      phase: options?.phase || 'orchestrate',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }

  static implement(
    run_id: string,
    agent_id: string,
    content: ImplementPacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): ImplementPacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'implement',
      run_id,
      agent_id,
      phase: options?.phase || 'execution',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }

  static validate(
    run_id: string,
    agent_id: string,
    content: ValidatePacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): ValidatePacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'validate',
      run_id,
      agent_id,
      phase: options?.phase || 'audit',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }

  static record(
    run_id: string,
    agent_id: string,
    content: RecordPacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): RecordPacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'record',
      run_id,
      agent_id,
      phase: options?.phase || 'evolution',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }

  static gate(
    run_id: string,
    agent_id: string,
    content: GatePacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): GatePacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'gate',
      run_id,
      agent_id,
      phase: options?.phase || 'audit',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }

  static council(
    run_id: string,
    agent_id: string,
    content: CouncilPacketContent,
    options?: { phase?: CICPhase; parent_packet_ids?: string[]; policy_context?: PolicyContext }
  ): CouncilPacket {
    return {
      packet_id: generateUUID(),
      packet_type: 'council',
      run_id,
      agent_id,
      phase: options?.phase || 'audit',
      timestamp: new Date().toISOString(),
      parent_packet_ids: options?.parent_packet_ids,
      policy_context: options?.policy_context,
      content,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getPacketTraceByRun(run_id: string, packets: GovernancePacket[]): GovernancePacket[] {
  return packets.filter((p) => p.run_id === run_id).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function getPacketsByType(
  packet_type: PacketType,
  packets: GovernancePacket[],
): GovernancePacket[] {
  return packets.filter((p) => p.packet_type === packet_type);
}

export function getPacketDependents(
  packet_id: string,
  packets: GovernancePacket[],
): GovernancePacket[] {
  return packets.filter((p) =>
    p.parent_packet_ids && p.parent_packet_ids.includes(packet_id)
  );
}
