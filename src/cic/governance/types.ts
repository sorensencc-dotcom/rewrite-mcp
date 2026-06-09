/**
 * CIC Governance - Core Type Definitions
 * Phase 24.1: Governance Model Specification
 */

/**
 * Policy Rail Precedence Order:
 * 1. HARD_SAFETY - non-negotiable constraints
 * 2. DOMAIN - project/tenant-specific constraints
 * 3. PHASE - phase-specific behavioral rules
 * 4. SOFT - guidance and heuristics (advisory)
 */
export enum RailCategory {
  HARD_SAFETY = 'HARD_SAFETY',
  DOMAIN = 'DOMAIN',
  PHASE = 'PHASE',
  SOFT = 'SOFT',
}

export interface PolicyRail {
  rail_id: string;
  category: RailCategory;
  name: string;
  description: string;
  domain?: string; // For DOMAIN rails
  phase?: string; // For PHASE rails
  constraint: (context: PolicyContext) => boolean | string; // Returns false/error msg if violated
  severity: 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Policy context for evaluating rails
 */
export interface PolicyContext {
  global_rails: string[];
  domain_rails: string[];
  phase_rails: string[];
  domain?: string;
  phase?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Council voting verdict
 */
export enum VoteVerdict {
  PERMIT = 'permit',
  BLOCK = 'block',
  REVISE = 'revise',
}

/**
 * Individual council member vote
 */
export interface CouncilVote {
  member_id: string;
  vote: VoteVerdict;
  rationale: string;
  confidence?: number; // 0-1
}

/**
 * Council voting result
 * Rule: unanimous block → BLOCK
 *       majority permit → PERMIT
 *       else → REVISE
 */
export interface CouncilVerdict {
  council_id: string;
  run_id: string;
  votes: CouncilVote[];
  verdict: VoteVerdict;
  conditions?: string[];
  timestamp: string;
}

/**
 * Decay candidate triggers
 */
export enum DecayTrigger {
  AGE = 'age', // Packet older than threshold
  LOW_USAGE = 'low_usage', // Not referenced recently
  CONTRADICTION = 'contradiction', // Contradicted by council verdict
  DRIFT = 'drift', // Associated with drift window
  LOW_QUALITY = 'low_quality', // Confidence below threshold
}

/**
 * Decay candidate for review
 */
export interface DecayCandidate {
  packet_id: string;
  triggers: DecayTrigger[];
  age_days: number;
  usage_count: number;
  last_used: string;
  confidence: number;
  suggested_action: 'decay' | 'pin' | 'review';
}

/**
 * Decay heuristic configuration
 */
export interface DecayConfig {
  age_threshold_days: number; // Default: 30
  usage_threshold_runs: number; // Default: 10
  quality_threshold: number; // Default: 0.6
  auto_decay_enabled: boolean;
  operator_override_enabled: boolean;
}

/**
 * Override types for governance decisions
 */
export enum OverrideType {
  SYSTEM = 'system', // System-level override (rare)
  PACKET = 'packet', // Override for specific packet
  POLICY = 'policy', // Override policy rail
  DECAY = 'decay', // Override decay decision
}

/**
 * Governance override record
 */
export interface GovernanceOverride {
  override_id: string;
  override_type: OverrideType;
  reason: string;
  target_id: string; // packet_id, rail_id, etc.
  operator_id: string;
  timestamp: string;
  expires?: string; // Optional expiry for time-bound overrides
}

/**
 * Rail conflict resolution context
 */
export interface RailConflict {
  conflicting_rails: PolicyRail[];
  context: PolicyContext;
  resolved_to: PolicyRail; // The most restrictive rail that wins
  rationale: string;
}
