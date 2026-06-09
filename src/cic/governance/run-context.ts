/**
 * CIC Run Context — Phase 24.4
 * Carries governance packets through phase boundaries
 *
 * Every RPI run has a RunContext that:
 * - Tracks run_id, phase progression, agent identity
 * - Stores packets produced during execution
 * - Provides phase hooks (onEnter, onExit)
 * - Enables gates and councils during phase transitions
 */

import { GovernancePacket, PacketType, CICPhase, PacketBuilder } from './packet-types';
import { PolicyContext } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface RunContextOptions {
  run_id?: string;
  agent_id: string;
  initial_phase: CICPhase;
  policy_context?: PolicyContext;
}

export interface PhaseTransition {
  from_phase: CICPhase;
  to_phase: CICPhase;
  timestamp: string;
  packets_produced: number;
}

export class RunContext {
  readonly run_id: string;
  readonly agent_id: string;
  readonly created_at: string;

  private current_phase: CICPhase;
  private packets: GovernancePacket[] = [];
  private phase_transitions: PhaseTransition[] = [];
  private policy_context: PolicyContext;

  // Phase-specific data
  private research_packet_id?: string;
  private plan_packet_id?: string;
  private implement_packet_id?: string;
  private validate_packet_id?: string;
  private record_packet_id?: string;

  constructor(options: RunContextOptions) {
    this.run_id = options.run_id || uuidv4();
    this.agent_id = options.agent_id;
    this.current_phase = options.initial_phase;
    this.created_at = new Date().toISOString();
    this.policy_context = options.policy_context || {};
  }

  /**
   * Get current phase
   */
  getPhase(): CICPhase {
    return this.current_phase;
  }

  /**
   * Transition to next phase
   */
  transitionToPhase(next_phase: CICPhase): void {
    const transition: PhaseTransition = {
      from_phase: this.current_phase,
      to_phase: next_phase,
      timestamp: new Date().toISOString(),
      packets_produced: this.packets.length,
    };

    this.phase_transitions.push(transition);
    this.current_phase = next_phase;
  }

  /**
   * Add packet to run context
   */
  addPacket(packet: GovernancePacket): void {
    this.packets.push(packet);

    // Track by type for easy retrieval
    switch (packet.packet_type) {
      case 'research':
        this.research_packet_id = packet.packet_id;
        break;
      case 'plan':
        this.plan_packet_id = packet.packet_id;
        break;
      case 'implement':
        this.implement_packet_id = packet.packet_id;
        break;
      case 'validate':
        this.validate_packet_id = packet.packet_id;
        break;
      case 'record':
        this.record_packet_id = packet.packet_id;
        break;
    }
  }

  /**
   * Get all packets in run
   */
  getPackets(): GovernancePacket[] {
    return [...this.packets];
  }

  /**
   * Get packets of specific type
   */
  getPacketsByType(packet_type: PacketType): GovernancePacket[] {
    return this.packets.filter(p => p.packet_type === packet_type);
  }

  /**
   * Get latest packet of type
   */
  getLatestPacketOfType(packet_type: PacketType): GovernancePacket | undefined {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      if (this.packets[i].packet_type === packet_type) {
        return this.packets[i];
      }
    }
    return undefined;
  }

  /**
   * Get research packet from this run
   */
  getResearchPacket(): GovernancePacket | undefined {
    return this.research_packet_id ? this.packets.find(p => p.packet_id === this.research_packet_id) : undefined;
  }

  /**
   * Get plan packet from this run
   */
  getPlanPacket(): GovernancePacket | undefined {
    return this.plan_packet_id ? this.packets.find(p => p.packet_id === this.plan_packet_id) : undefined;
  }

  /**
   * Get implement packet from this run
   */
  getImplementPacket(): GovernancePacket | undefined {
    return this.implement_packet_id ? this.packets.find(p => p.packet_id === this.implement_packet_id) : undefined;
  }

  /**
   * Get validate packet from this run (may be updated during audit)
   */
  getValidatePacket(): GovernancePacket | undefined {
    return this.validate_packet_id ? this.packets.find(p => p.packet_id === this.validate_packet_id) : undefined;
  }

  /**
   * Get record packet from this run
   */
  getRecordPacket(): GovernancePacket | undefined {
    return this.record_packet_id ? this.packets.find(p => p.packet_id === this.record_packet_id) : undefined;
  }

  /**
   * Get phase transitions
   */
  getPhaseTransitions(): PhaseTransition[] {
    return [...this.phase_transitions];
  }

  /**
   * Get policy context for current phase
   */
  getPolicyContext(): PolicyContext {
    return { ...this.policy_context };
  }

  /**
   * Update policy context (e.g., when new rails apply)
   */
  updatePolicyContext(context: Partial<PolicyContext>): void {
    this.policy_context = {
      ...this.policy_context,
      ...context,
    };
  }

  /**
   * Get run summary
   */
  getSummary() {
    return {
      run_id: this.run_id,
      agent_id: this.agent_id,
      created_at: this.created_at,
      current_phase: this.current_phase,
      total_packets: this.packets.length,
      packet_types: this.getPacketTypeDistribution(),
      phase_transitions: this.phase_transitions.length,
      packet_ids_by_type: {
        research: this.research_packet_id,
        plan: this.plan_packet_id,
        implement: this.implement_packet_id,
        validate: this.validate_packet_id,
        record: this.record_packet_id,
      },
    };
  }

  /**
   * Get distribution of packet types
   */
  private getPacketTypeDistribution(): Record<PacketType, number> {
    const distribution: Record<PacketType, number> = {
      research: 0,
      plan: 0,
      implement: 0,
      validate: 0,
      record: 0,
      gate: 0,
      council: 0,
      evolution_step: 0,
      drift: 0,
      rollback: 0,
    };

    for (const packet of this.packets) {
      distribution[packet.packet_type]++;
    }

    return distribution;
  }
}
