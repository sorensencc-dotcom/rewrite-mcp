/**
 * Build Governance Integration — Phase 24.5
 * Wires Phase 0.7/0.9 lineage packets into Phase 24 governance vault
 *
 * Flow:
 * 1. Ingest lineage packet (from build system)
 * 2. Validate SBOM + provenance
 * 3. Create GatePacket (build validation evidence)
 * 4. Invoke CouncilPacket (production promotion vote)
 * 5. Record all packets in GovernanceMemoryStore
 *
 * Integration Points:
 * - RunContext: carries packets through orchestrate → execution phases
 * - GovernanceMemoryStore: vault for all evidence
 * - PolicyRails: domain/hard_safety checks on build promotion
 */

import {
  BuildLineagePacket,
  GatePacket,
  CouncilPacket,
  GovernancePacket,
  PacketBuilder,
  CICPhase,
} from './packet-types.js';
import { BuildValidator, BuildValidationResult } from './build-validator.js';
import {
  BuildApprovalGate,
  PromotionTarget,
  PromotionVerdict,
} from './build-approval-gate.js';
import { GovernanceMemoryStore } from './governance-memory-store.js';
import { RunContext } from './run-context.js';
import { PolicyRail } from './types.js';

export interface BuildIntegrationConfig {
  memory_store: GovernanceMemoryStore;
  active_policies: PolicyRail[];
  promotion_target?: PromotionTarget;
  require_council_vote?: boolean;
}

export interface IntegrationResult {
  lineage_packet: BuildLineagePacket;
  validation_result: BuildValidationResult;
  gate_packet: GatePacket;
  council_packet?: CouncilPacket;
  promotion_verdict?: PromotionVerdict;
  all_packets: GovernancePacket[];
  integration_timestamp: string;
}

export class BuildGovernanceIntegration {
  private config: BuildIntegrationConfig;
  private validator: BuildValidator;
  private gate: BuildApprovalGate;

  constructor(config: BuildIntegrationConfig) {
    this.config = config;
    this.validator = new BuildValidator(config.active_policies);
    this.gate = new BuildApprovalGate();
  }

  /**
   * Ingest a lineage packet and produce governance evidence
   * Returns all packets produced + final verdict
   */
  async ingestLineagePacket(
    lineagePacket: BuildLineagePacket,
    runContext: RunContext,
    options?: { strict?: boolean; promoted_to?: PromotionTarget }
  ): Promise<IntegrationResult> {
    const allPackets: GovernancePacket[] = [];
    const now = new Date().toISOString();
    const run_id = runContext.run_id;

    // Step 1: Store lineage packet in vault
    this.config.memory_store.storePacket(lineagePacket);
    runContext.addPacket(lineagePacket);
    allPackets.push(lineagePacket);

    // Step 2: Validate SBOM + provenance
    const validation = this.validator.validate(lineagePacket, {
      strict: options?.strict,
      validating_agent: runContext.agent_id,
    });

    // Step 3: Create gate packet with validation results
    const gateDecision = this.gate.evaluateGate(
      lineagePacket,
      validation,
      run_id
    );
    const gatePacket = this.gate.createGatePacket(
      gateDecision,
      run_id,
      runContext.agent_id,
      [lineagePacket.packet_id]
    );
    this.config.memory_store.storePacket(gatePacket);
    runContext.addPacket(gatePacket);
    allPackets.push(gatePacket);

    // Step 4: Optionally invoke council vote for production promotion
    let councilPacket: CouncilPacket | undefined;
    let promotionVerdict: PromotionVerdict | undefined;

    const target = options?.promoted_to || this.config.promotion_target || 'staging';
    const requiresCouncil =
      this.config.require_council_vote !== false && target === 'production';

    if (requiresCouncil || gateDecision.requires_council) {
      const votes = this.gate.collectCouncilVotes(gateDecision);
      promotionVerdict = this.gate.computeVerdict(
        lineagePacket.content.build_id,
        target,
        votes
      );

      councilPacket = this.gate.createCouncilPacket(
        promotionVerdict,
        run_id,
        runContext.agent_id,
        [gatePacket.packet_id]
      );

      this.config.memory_store.storePacket(councilPacket);
      runContext.addPacket(councilPacket);
      allPackets.push(councilPacket);

      // Update lineage packet with validation status
      lineagePacket.content.validation_status =
        promotionVerdict.verdict === 'permit' ? 'passed' : 'failed';
    } else {
      // Validation passed, mark as ready
      lineagePacket.content.validation_status =
        validation.overall_status === 'passed' ? 'passed' : 'failed';
    }

    // Step 5: Update lineage packet with validation errors if any
    if (validation.failed_checks.length > 0) {
      lineagePacket.content.validation_errors = validation.failed_checks.map(
        (c) => c.check_id
      );
    }

    // Re-store with updated status
    this.config.memory_store.storePacket(lineagePacket);

    return {
      lineage_packet: lineagePacket,
      validation_result: validation,
      gate_packet: gatePacket,
      council_packet: councilPacket,
      promotion_verdict: promotionVerdict,
      all_packets: allPackets,
      integration_timestamp: now,
    };
  }

  /**
   * Batch ingest multiple lineage packets (e.g., parallel builds from Phase 0.7)
   * Returns aggregated result with all packets
   */
  async ingestLineagePackets(
    lineagePackets: BuildLineagePacket[],
    runContext: RunContext,
    options?: { strict?: boolean; promoted_to?: PromotionTarget }
  ): Promise<{
    results: IntegrationResult[];
    total_packets: number;
    total_passed: number;
    total_failed: number;
    all_packets: GovernancePacket[];
  }> {
    const results: IntegrationResult[] = [];
    const allPackets: GovernancePacket[] = [];
    let passCount = 0,
      failCount = 0;

    for (const packet of lineagePackets) {
      const result = await this.ingestLineagePacket(packet, runContext, options);
      results.push(result);
      allPackets.push(...result.all_packets);

      if (result.validation_result.overall_status === 'passed') {
        passCount++;
      } else {
        failCount++;
      }
    }

    return {
      results,
      total_packets: lineagePackets.length,
      total_passed: passCount,
      total_failed: failCount,
      all_packets: allPackets,
    };
  }

  /**
   * Query governance vault for build evidence
   * Returns all packets related to a build_id
   */
  queryBuildEvidence(build_id: string): GovernancePacket[] {
    const packets = this.config.memory_store.query({
      limit: 1000,
    });

    return packets.packets.filter(
      (p) =>
        (p.packet_type === 'build_lineage' &&
          (p as BuildLineagePacket).content.build_id === build_id) ||
        (p.packet_type === 'gate' && p.content.run_id) ||
        (p.packet_type === 'council' && p.content.run_id)
    );
  }

  /**
   * Generate promotion audit trail
   * Returns all packets from lineage through council verdict
   */
  getPromotionAuditTrail(
    build_id: string
  ): {
    lineage?: BuildLineagePacket;
    validation?: GatePacket;
    council_vote?: CouncilPacket;
  } {
    const evidence = this.queryBuildEvidence(build_id);
    const result: {
      lineage?: BuildLineagePacket;
      validation?: GatePacket;
      council_vote?: CouncilPacket;
    } = {};

    for (const packet of evidence) {
      if (
        packet.packet_type === 'build_lineage' &&
        (packet as BuildLineagePacket).content.build_id === build_id
      ) {
        result.lineage = packet as BuildLineagePacket;
      } else if (packet.packet_type === 'gate') {
        result.validation = packet as GatePacket;
      } else if (packet.packet_type === 'council') {
        result.council_vote = packet as CouncilPacket;
      }
    }

    return result;
  }

  /**
   * Policy check: verify all artifacts have passed validation
   * Used in orchestrate/execution phase transitions
   */
  canPromoteToProd(buildId: string): {
    can_promote: boolean;
    reason?: string;
    blockers?: string[];
  } {
    const audit = this.getPromotionAuditTrail(buildId);

    if (!audit.lineage) {
      return {
        can_promote: false,
        reason: 'No lineage packet found',
      };
    }

    if (!audit.council_vote) {
      return {
        can_promote: false,
        reason: 'No council approval',
      };
    }

    const verdict = audit.council_vote.content.verdict;
    const blockers: string[] = [];

    if (verdict === 'block') {
      blockers.push('Council vote unanimous block');
      return {
        can_promote: false,
        blockers,
        reason: 'Blocked by council',
      };
    }

    if (verdict === 'revise') {
      blockers.push('Council vote revise');
      if (audit.council_vote.content.conditions) {
        blockers.push(...audit.council_vote.content.conditions);
      }
      return {
        can_promote: false,
        blockers,
        reason: 'Requires revisions per council conditions',
      };
    }

    return {
      can_promote: verdict === 'permit',
      reason: verdict === 'permit' ? 'Approved by council' : 'Pending council decision',
    };
  }
}
