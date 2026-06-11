/**
 * CIC Governance Module — Complete Export
 * Phase 24.1, 24.2, 24.3, 24.4, 24.5
 */

// Phase 24.1 — Governance Model
export * from './types';
export { CouncilVoting } from './council-voting';
export { PolicyRails, DEFAULT_HARD_SAFETY_RAILS } from './policy-rails';
export { DecayLogic } from './decay-logic';

// Phase 24.2 — Evidence Vault Schema
export * from './packet-types';
export { PacketValidator, ValidationResult } from './packet-validator';

// Phase 24.3 — MemoryStore Tier 2
export { GovernanceMemoryStore, Snapshot, QueryFilter, QueryResult } from './governance-memory-store';

// Phase 24.4 — Phase API Contracts
export { RunContext, PhaseTransition } from './run-context';
export * from './phase-contracts';

// Phase 24.5 — Build Governance Integration
export { BuildValidator, BuildValidationResult, ValidationCheck, ValidationStatus } from './build-validator';
export {
  BuildApprovalGate,
  PromotionRequest,
  PromotionTarget,
  PromotionVerdict,
  GateDecision,
  CouncilPromotionVote,
} from './build-approval-gate';
export {
  BuildGovernanceIntegration,
  BuildIntegrationConfig,
  IntegrationResult,
} from './build-governance-integration';

// Governance engine (composite)
export class GovernanceEngine {
  council: any; // Will be initialized with CouncilVoting
  rails: any; // Will be initialized with PolicyRails
  decay: any; // Will be initialized with DecayLogic
  memory: any; // Will be initialized with GovernanceMemoryStore

  constructor() {
    this.council = null;
    this.rails = null;
    this.decay = null;
    this.memory = null;
  }
}
