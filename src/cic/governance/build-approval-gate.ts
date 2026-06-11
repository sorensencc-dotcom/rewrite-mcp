/**
 * Build Approval Gate — Phase 24.5
 * Council voting gate for build promotions to production
 *
 * Flow:
 * 1. BuildValidator produces validation result
 * 2. BuildApprovalGate triggers if validation passed
 * 3. Council votes on production promotion
 * 4. Verdict (PERMIT/BLOCK/REVISE) recorded in CouncilPacket
 */

import {
  BuildLineagePacket,
  GatePacket,
  CouncilPacket,
  PacketBuilder,
  CouncilVote,
} from './packet-types.js';
import { BuildValidationResult } from './build-validator.js';

export type PromotionTarget = 'staging' | 'production' | 'canary';
export type PromotionPhase = 'orchestrate' | 'execution';

export interface PromotionRequest {
  build_id: string;
  artifact_ids: string[];
  source_agent: string;
  target: PromotionTarget;
  phase: PromotionPhase;
  validation_result: BuildValidationResult;
  risk_summary?: string;
}

export interface GateDecision {
  gate_id: string;
  request: PromotionRequest;
  checks: Array<{
    check_id: string;
    name: string;
    status: 'pass' | 'fail' | 'warn';
  }>;
  validation_passed: boolean;
  requires_council: boolean;
  decision_timestamp: string;
}

export interface CouncilPromotionVote extends CouncilVote {
  council_member_id: string;
  vote: 'permit' | 'block' | 'revise';
  rationale: string;
  risk_concerns?: string[];
  conditions?: string[];
  confidence?: number;
}

export interface PromotionVerdict {
  promotion_id: string;
  build_id: string;
  target: PromotionTarget;
  verdict: 'permit' | 'block' | 'revise';
  votes: CouncilPromotionVote[];
  permit_votes: number;
  block_votes: number;
  revise_votes: number;
  unanimous_block: boolean;
  majority_permit: boolean;
  conditions?: string[];
  approval_timestamp: string;
}

export class BuildApprovalGate {
  private council_members: string[] = [
    'safety_council',
    'performance_council',
    'security_council',
  ];

  /**
   * Run gate checks on build lineage packet
   * Returns gating decision + whether council vote is required
   */
  evaluateGate(
    packet: BuildLineagePacket,
    validation: BuildValidationResult,
    run_id: string
  ): GateDecision {
    const checks = validation.checks.map((c) => ({
      check_id: c.check_id,
      name: c.description,
      status: c.status,
    }));

    const validation_passed = validation.overall_status === 'passed';
    const has_hard_safety_violation = validation.failed_checks.some((c) =>
      c.severity === 'hard_safety'
    );

    // Always require council for production, staging only if validation failed
    const requires_council = true; // Build promotions always require council review

    return {
      gate_id: `build-approval-${validation.build_id}`,
      request: {
        build_id: validation.build_id,
        artifact_ids: packet.content.artifacts.map((a) => a.artifact_id),
        source_agent: packet.agent_id,
        target: 'production',
        phase: packet.content.phase,
        validation_result: validation,
        risk_summary: has_hard_safety_violation
          ? 'Hard safety violations detected — council approval required'
          : 'Standard promotion gate — council review recommended',
      },
      checks,
      validation_passed,
      requires_council,
      decision_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a GatePacket from gate evaluation
   */
  createGatePacket(
    decision: GateDecision,
    run_id: string,
    agent_id: string,
    parent_packet_ids: string[]
  ): GatePacket {
    return PacketBuilder.gate(run_id, agent_id, {
      gate_id: 'build_approval',
      run_id,
      phase: 'execution',
      result: decision.validation_passed ? 'pass' : 'fail',
      checks: decision.checks.map((c) => ({
        check_id: c.check_id,
        status: c.status,
        details: c.name,
      })),
      violations: decision.request.validation_result.failed_checks.map(
        (c) => c.check_id
      ),
      timestamp: decision.decision_timestamp,
    });
  }

  /**
   * Simulate council votes (in production, integrate with governance council)
   * For now: returns synthetic votes based on validation result
   */
  collectCouncilVotes(
    decision: GateDecision,
    actual_votes?: CouncilPromotionVote[]
  ): CouncilPromotionVote[] {
    if (actual_votes && actual_votes.length > 0) {
      return actual_votes;
    }

    // Synthetic voting logic for testing
    const validation = decision.request.validation_result;
    const votes: CouncilPromotionVote[] = [];

    // Safety Council: blocks on hard_safety violations
    if (validation.failed_checks.some((c) => c.severity === 'hard_safety')) {
      votes.push({
        council_member_id: 'safety_council',
        member_id: 'safety_council',
        vote: 'block',
        rationale: 'Hard safety violations must be resolved',
        risk_concerns: validation.failed_checks
          .filter((c) => c.severity === 'hard_safety')
          .map((c) => c.check_id),
        confidence: 1.0,
      });
    } else {
      votes.push({
        council_member_id: 'safety_council',
        member_id: 'safety_council',
        vote: 'permit',
        rationale: 'All safety checks passed',
        confidence: 0.95,
      });
    }

    // Performance Council: revises if warnings exist, permits otherwise
    if (validation.warnings.length > 0) {
      votes.push({
        council_member_id: 'performance_council',
        member_id: 'performance_council',
        vote: 'revise',
        rationale: 'Performance warnings detected — recommend review',
        risk_concerns: validation.warnings.map((w) => w.check_id),
        conditions: ['Document performance impact before staging'],
        confidence: 0.7,
      });
    } else {
      votes.push({
        council_member_id: 'performance_council',
        member_id: 'performance_council',
        vote: 'permit',
        rationale: 'Performance validation passed',
        confidence: 0.9,
      });
    }

    // Security Council: permits after domain checks pass
    if (validation.failed_checks.some((c) => c.severity === 'domain')) {
      votes.push({
        council_member_id: 'security_council',
        member_id: 'security_council',
        vote: 'revise',
        rationale: 'Domain-level security checks require attention',
        risk_concerns: validation.failed_checks
          .filter((c) => c.severity === 'domain')
          .map((c) => c.check_id),
        confidence: 0.8,
      });
    } else {
      votes.push({
        council_member_id: 'security_council',
        member_id: 'security_council',
        vote: 'permit',
        rationale: 'Supply chain and artifact validation passed',
        confidence: 0.92,
      });
    }

    return votes;
  }

  /**
   * Compute promotion verdict from council votes
   * Rule: unanimous block → BLOCK, else majority permit → PERMIT, else REVISE
   */
  computeVerdict(
    build_id: string,
    target: PromotionTarget,
    votes: CouncilPromotionVote[]
  ): PromotionVerdict {
    const block_votes = votes.filter((v) => v.vote === 'block').length;
    const permit_votes = votes.filter((v) => v.vote === 'permit').length;
    const revise_votes = votes.filter((v) => v.vote === 'revise').length;

    const unanimous_block = block_votes > 0 && revise_votes === 0 && permit_votes === 0;
    const majority_permit = permit_votes > votes.length / 2;

    let verdict: PromotionVerdict['verdict'] = 'revise';
    if (block_votes > 0) {
      verdict = 'block';
    } else if (majority_permit) {
      verdict = 'permit';
    }

    // Collect conditions from votes
    const conditions = votes
      .flatMap((v) => v.conditions || [])
      .filter((c, i, a) => a.indexOf(c) === i); // Deduplicate

    return {
      promotion_id: `promo-${build_id}-${new Date().getTime()}`,
      build_id,
      target,
      verdict,
      votes,
      permit_votes,
      block_votes,
      revise_votes,
      unanimous_block,
      majority_permit,
      conditions: conditions.length > 0 ? conditions : undefined,
      approval_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a CouncilPacket from promotion verdict
   */
  createCouncilPacket(
    verdict: PromotionVerdict,
    run_id: string,
    agent_id: string,
    parent_packet_ids: string[]
  ): CouncilPacket {
    return PacketBuilder.council(
      run_id,
      agent_id,
      {
        council_id: 'build_promotion_council',
        run_id,
        votes: verdict.votes.map((v) => ({
          member_id: v.council_member_id,
          vote: v.vote,
          rationale: v.rationale,
          confidence: v.confidence,
        })),
        verdict: verdict.verdict,
        conditions: verdict.conditions,
        timestamp: verdict.approval_timestamp,
      },
      { phase: 'execution', parent_packet_ids }
    );
  }
}
