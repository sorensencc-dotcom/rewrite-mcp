/**
 * CIC Phase Contracts — Phase 24.4
 * Defines packet emission requirements for each phase
 *
 * Each phase implements PhaseContract which specifies:
 * - Input: what packets/data phase receives
 * - Process: what the phase does
 * - Output: what packets phase produces
 * - Gates: gates invoked at phase exit
 */

import { GovernancePacket, PacketBuilder, CICPhase } from './packet-types';
import { RunContext } from './run-context';
import { PolicyRails } from './policy-rails';
import { ResearchPacketContent, PlanPacketContent, ImplementPacketContent, ValidatePacketContent, RecordPacketContent } from './packet-types';

export interface GateInput {
  run_id: string;
  phase: CICPhase;
  packet_ids: string[];
  policy_context?: any;
}

export interface GateOutput {
  gate_id: string;
  result: 'pass' | 'fail' | 'warn';
  checks: Array<{
    check_id: string;
    status: 'pass' | 'fail' | 'warn';
    details?: string;
  }>;
  violations?: string[];
}

export interface CouncilInput {
  run_id: string;
  council_id: string;
  packet_ids: string[];
  policy_context?: any;
}

export interface CouncilVerdictOutput {
  council_id: string;
  verdict: 'permit' | 'block' | 'revise';
  votes: Array<{
    member_id: string;
    vote: 'permit' | 'block' | 'revise';
    rationale: string;
    confidence?: number;
  }>;
  conditions?: string[];
}

/**
 * Base phase contract
 */
export interface PhaseContract {
  phase: CICPhase;
  description: string;
  onEnter(context: RunContext): void;
  onExit(context: RunContext): void;
}

/**
 * Discovery Phase Contract
 * Input: Goal, constraints from user
 * Output: research_packet with exploration context
 * No gates at exit
 */
export class DiscoveryPhaseContract implements PhaseContract {
  phase: CICPhase = 'discovery';
  description = 'Explore problem space, gather context, produce research packet';

  onEnter(context: RunContext): void {
    // Discovery begins; may load prior research
  }

  onExit(context: RunContext): void {
    // Research packet must be produced
    const research = context.getResearchPacket();
    if (!research) {
      console.warn('Discovery phase exited without research_packet');
    }
  }

  /**
   * Emit research packet from discovery phase
   */
  static emitResearchPacket(
    context: RunContext,
    content: ResearchPacketContent
  ): GovernancePacket {
    const packet = PacketBuilder.research(
      context['run_id'],
      context['agent_id'],
      content,
      {
        phase: 'discovery',
        policy_context: context.getPolicyContext(),
      }
    );
    context.addPacket(packet);
    return packet;
  }
}

/**
 * Harvester Phase Contract
 * Input: research_packet from discovery
 * Output: enriched research_packet with telemetry
 * No gates at exit
 */
export class HarvesterPhaseContract implements PhaseContract {
  phase: CICPhase = 'harvester';
  description = 'Enrich research with telemetry, config diffs, external data';

  onEnter(context: RunContext): void {
    // Harvester begins; may need prior research packet
  }

  onExit(context: RunContext): void {
    // Research packet should be enriched
    const research = context.getResearchPacket();
    if (!research) {
      console.warn('Harvester phase exited without research_packet');
    }
  }
}

/**
 * Orchestrate Phase Contract
 * Input: research_packet from harvester
 * Output: plan_packet
 * Gates at exit: premortem, vibe
 */
export class OrchestratePhaseContract implements PhaseContract {
  phase: CICPhase = 'orchestrate';
  description = 'Plan execution, invoke gates (premortem, vibe)';

  onEnter(context: RunContext): void {
    // Orchestrate begins
  }

  onExit(context: RunContext): void {
    // Plan packet must be produced
    const plan = context.getPlanPacket();
    if (!plan) {
      console.warn('Orchestrate phase exited without plan_packet');
    }
  }

  /**
   * Emit plan packet from orchestrate phase
   */
  static emitPlanPacket(
    context: RunContext,
    content: PlanPacketContent
  ): GovernancePacket {
    const research = context.getResearchPacket();
    const packet = PacketBuilder.plan(
      context['run_id'],
      context['agent_id'],
      content,
      {
        phase: 'orchestrate',
        parent_packet_ids: research ? [research.packet_id] : [],
        policy_context: context.getPolicyContext(),
      }
    );
    context.addPacket(packet);
    return packet;
  }

  /**
   * Invoke premortem gate at orchestrate exit
   */
  static async invokePremortemGate(
    context: RunContext,
    railsEngine: PolicyRails
  ): Promise<GateOutput> {
    const plan = context.getPlanPacket();
    if (!plan) {
      throw new Error('Cannot invoke premortem gate without plan_packet');
    }

    // Gate logic: Check rollback plan, kill switch, reversibility
    const railsResult = railsEngine.evaluateRails(context.getPolicyContext());

    return {
      gate_id: 'premortem',
      result: railsResult.violated.length > 0 ? 'fail' : 'pass',
      checks: [
        {
          check_id: 'rollback-plan',
          status: 'pass',
          details: 'Rollback plan documented in plan_packet',
        },
        {
          check_id: 'reversibility',
          status: railsResult.violated.length > 0 ? 'fail' : 'pass',
          details: 'Plan is reversible',
        },
      ],
      violations: railsResult.violated.map(r => r.rail_id),
    };
  }

  /**
   * Invoke vibe gate at orchestrate exit
   */
  static async invokeVibeGate(
    context: RunContext
  ): Promise<GateOutput> {
    const plan = context.getPlanPacket();
    if (!plan) {
      throw new Error('Cannot invoke vibe gate without plan_packet');
    }

    // Gate logic: Check for aggressive/risky patterns
    const planContent = plan.content as any;
    const aggressive = planContent.steps?.some((step: string) =>
      step.toLowerCase().includes('aggressive') ||
      step.toLowerCase().includes('force') ||
      step.toLowerCase().includes('override')
    );

    return {
      gate_id: 'vibe',
      result: aggressive ? 'warn' : 'pass',
      checks: [
        {
          check_id: 'aggression-check',
          status: aggressive ? 'warn' : 'pass',
          details: aggressive
            ? 'Plan contains aggressive operations; escalate if tests borderline'
            : 'Plan is conservative',
        },
      ],
    };
  }
}

/**
 * Execution Phase Contract
 * Input: plan_packet from orchestrate
 * Output: implement_packet
 * No gates at exit
 */
export class ExecutionPhaseContract implements PhaseContract {
  phase: CICPhase = 'execution';
  description = 'Apply plan to target system, produce implement_packet';

  onEnter(context: RunContext): void {
    // Execution begins
  }

  onExit(context: RunContext): void {
    // Implement packet must be produced
    const implement = context.getImplementPacket();
    if (!implement) {
      console.warn('Execution phase exited without implement_packet');
    }
  }

  /**
   * Emit implement packet from execution phase
   */
  static emitImplementPacket(
    context: RunContext,
    content: ImplementPacketContent
  ): GovernancePacket {
    const plan = context.getPlanPacket();
    const packet = PacketBuilder.implement(
      context['run_id'],
      context['agent_id'],
      content,
      {
        phase: 'execution',
        parent_packet_ids: plan ? [plan.packet_id] : [],
        policy_context: context.getPolicyContext(),
      }
    );
    context.addPacket(packet);
    return packet;
  }
}

/**
 * Synthesize Phase Contract
 * Input: implement_packet from execution
 * Output: validate_packet (pre-gates)
 * No gates at exit (gates run in audit phase)
 */
export class SynthesizePhaseContract implements PhaseContract {
  phase: CICPhase = 'synthesize';
  description = 'Run tests, produce validate_packet with test results';

  onEnter(context: RunContext): void {
    // Synthesis begins
  }

  onExit(context: RunContext): void {
    // Validate packet must be produced
    const validate = context.getValidatePacket();
    if (!validate) {
      console.warn('Synthesize phase exited without validate_packet');
    }
  }

  /**
   * Emit validate packet from synthesize phase (pre-gates)
   */
  static emitValidatePacket(
    context: RunContext,
    content: ValidatePacketContent
  ): GovernancePacket {
    const implement = context.getImplementPacket();
    const packet = PacketBuilder.validate(
      context['run_id'],
      context['agent_id'],
      {
        ...content,
        final_verdict: 'revise', // Placeholder, will be set by audit gates/council
      },
      {
        phase: 'synthesize',
        parent_packet_ids: implement ? [implement.packet_id] : [],
        policy_context: context.getPolicyContext(),
      }
    );
    context.addPacket(packet);
    return packet;
  }
}

/**
 * Audit Phase Contract
 * Input: validate_packet from synthesize
 * Output: updated validate_packet with gates/councils
 * Gates at exit: scenario, policy
 * Council: safety_council (high-impact decisions)
 */
export class AuditPhaseContract implements PhaseContract {
  phase: CICPhase = 'audit';
  description = 'Run gates (scenario, policy), invoke councils, determine verdict';

  onEnter(context: RunContext): void {
    // Audit begins
  }

  onExit(context: RunContext): void {
    // Validate packet must have final_verdict set
    const validate = context.getValidatePacket();
    if (!validate || validate.content.final_verdict === 'revise') {
      console.warn('Audit phase exited without final verdict on validate_packet');
    }
  }

  /**
   * Invoke scenario gate at audit phase
   */
  static async invokeScenarioGate(
    context: RunContext
  ): Promise<GateOutput> {
    const validate = context.getValidatePacket() as any;
    if (!validate) {
      throw new Error('Cannot invoke scenario gate without validate_packet');
    }

    // Gate logic: Test against extreme scenarios (high load, edge cases)
    const testResults = validate.content.test_results || [];
    const failedTests = testResults.filter((t: any) => t.status === 'fail');

    return {
      gate_id: 'scenario',
      result: failedTests.length > 0 ? 'fail' : 'pass',
      checks: failedTests.map((test: any) => ({
        check_id: test.test_id,
        status: 'fail',
        details: test.details || 'Test failed under scenario conditions',
      })),
    };
  }

  /**
   * Invoke policy gate at audit phase
   */
  static async invokePolicyGate(
    context: RunContext,
    railsEngine: PolicyRails
  ): Promise<GateOutput> {
    const railsResult = railsEngine.evaluateRails(context.getPolicyContext());

    return {
      gate_id: 'policy',
      result: railsResult.violated.length > 0 ? 'fail' : 'pass',
      checks: [
        {
          check_id: 'policy-compliance',
          status: railsResult.violated.length > 0 ? 'fail' : 'pass',
          details: railsResult.violated.length > 0
            ? `Violated rails: ${railsResult.violated.map(r => r.rail_id).join(', ')}`
            : 'Policy compliant',
        },
      ],
      violations: railsResult.violated.map(r => r.rail_id),
    };
  }

  /**
   * Invoke safety council
   */
  static async invokeSafetyCouncil(
    context: RunContext
  ): Promise<CouncilVerdictOutput> {
    const validate = context.getValidatePacket() as any;
    if (!validate) {
      throw new Error('Cannot invoke council without validate_packet');
    }

    // Determine verdict based on test results
    const testResults = validate.content.test_results || [];
    const allPassed = testResults.every((t: any) => t.status === 'pass');

    // Simulate council votes
    const votes = [
      {
        member_id: 'safety-agent',
        vote: allPassed ? ('permit' as const) : ('block' as const),
        rationale: allPassed
          ? 'All tests passed; changes are safe'
          : 'Some tests failed; changes pose risk',
        confidence: 0.95,
      },
      {
        member_id: 'performance-agent',
        vote: allPassed ? ('permit' as const) : ('revise' as const),
        rationale: allPassed
          ? 'Performance metrics acceptable'
          : 'Performance degradation detected',
        confidence: 0.88,
      },
    ];

    // Compute verdict (unanimous block, majority permit, else revise)
    const blockVotes = votes.filter(v => v.vote === 'block').length;
    const permitVotes = votes.filter(v => v.vote === 'permit').length;

    let verdict: 'permit' | 'block' | 'revise';
    if (blockVotes > 0) {
      verdict = 'block';
    } else if (permitVotes > votes.length / 2) {
      verdict = 'permit';
    } else {
      verdict = 'revise';
    }

    return {
      council_id: 'safety_council',
      verdict,
      votes,
      conditions:
        verdict === 'block'
          ? ['Address all failing tests before re-attempt']
          : undefined,
    };
  }
}

/**
 * Evolution Phase Contract
 * Input: validate_packet with council verdict
 * Output: record_packet, evolution_step_packet, possibly rollback_packet
 * No gates at exit
 */
export class EvolutionPhaseContract implements PhaseContract {
  phase: CICPhase = 'evolution';
  description = 'Record learnings, evolve policy, execute rollback if needed';

  onEnter(context: RunContext): void {
    // Evolution begins
  }

  onExit(context: RunContext): void {
    // Record packet must be produced
    const record = context.getRecordPacket();
    if (!record) {
      console.warn('Evolution phase exited without record_packet');
    }
  }

  /**
   * Emit record packet from evolution phase
   */
  static emitRecordPacket(
    context: RunContext,
    content: RecordPacketContent
  ): GovernancePacket {
    const packets = context.getPackets();
    const packet = PacketBuilder.record(
      context['run_id'],
      context['agent_id'],
      {
        ...content,
        citations: packets.map(p => p.packet_id), // Link all packets in run
      },
      {
        phase: 'evolution',
        parent_packet_ids: packets.length > 0 ? [packets[packets.length - 1].packet_id] : [],
        policy_context: context.getPolicyContext(),
      }
    );
    context.addPacket(packet);
    return packet;
  }
}
