/**
 * CIC Packet Validator
 * Phase 24.2: Validates packets against schemas
 */

import {
  GovernancePacket,
  PacketType,
  ResearchPacket,
  PlanPacket,
  ImplementPacket,
  ValidatePacket,
  RecordPacket,
  GatePacket,
  CouncilPacket,
  EvolutionStepPacket,
  DriftPacket,
  RollbackPacket,
} from './packet-types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PacketValidator {
  /**
   * Validate a packet envelope
   */
  static validateEnvelope(packet: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!packet.packet_id) errors.push('Missing packet_id');
    else if (!this.isValidUUID(packet.packet_id)) errors.push('Invalid packet_id format (not UUID)');

    if (!packet.packet_type) errors.push('Missing packet_type');
    else if (!this.isValidPacketType(packet.packet_type))
      errors.push(`Invalid packet_type: ${packet.packet_type}`);

    if (!packet.run_id) errors.push('Missing run_id');
    else if (!this.isValidUUID(packet.run_id)) errors.push('Invalid run_id format (not UUID)');

    if (!packet.agent_id) errors.push('Missing agent_id');

    if (!packet.phase) errors.push('Missing phase');
    else if (!this.isValidPhase(packet.phase)) errors.push(`Invalid phase: ${packet.phase}`);

    if (!packet.timestamp) errors.push('Missing timestamp');
    else if (!this.isValidISO8601(packet.timestamp)) errors.push('Invalid timestamp format');

    if (!packet.content) errors.push('Missing content');

    // Optional fields validation
    if (packet.parent_packet_ids) {
      if (!Array.isArray(packet.parent_packet_ids))
        errors.push('parent_packet_ids must be an array');
      else {
        for (const id of packet.parent_packet_ids) {
          if (!this.isValidUUID(id)) errors.push(`Invalid parent_packet_id: ${id}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate research packet content
   */
  static validateResearch(packet: ResearchPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.goal) errors.push('ResearchPacket: Missing goal');
    if (!content.constraints || !Array.isArray(content.constraints))
      errors.push('ResearchPacket: constraints must be an array');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate plan packet content
   */
  static validatePlan(packet: PlanPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.steps || !Array.isArray(content.steps) || content.steps.length === 0)
      errors.push('PlanPacket: steps must be a non-empty array');

    if (!content.acceptance_criteria || !Array.isArray(content.acceptance_criteria))
      errors.push('PlanPacket: acceptance_criteria must be an array');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate implement packet content
   */
  static validateImplement(packet: ImplementPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.diffs || !Array.isArray(content.diffs))
      errors.push('ImplementPacket: diffs must be an array');

    if (!content.commands || !Array.isArray(content.commands))
      errors.push('ImplementPacket: commands must be an array');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate validate packet content
   */
  static validateValidate(packet: ValidatePacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.test_results || !Array.isArray(content.test_results))
      errors.push('ValidatePacket: test_results must be an array');
    else {
      for (const test of content.test_results) {
        if (!test.test_id) errors.push('ValidatePacket: test missing test_id');
        if (!test.status || !['pass', 'fail', 'skip', 'error'].includes(test.status))
          errors.push(`ValidatePacket: invalid test status: ${test.status}`);
      }
    }

    if (!content.final_verdict || !['permit', 'block', 'revise'].includes(content.final_verdict))
      errors.push(`ValidatePacket: invalid final_verdict: ${content.final_verdict}`);

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate record packet content
   */
  static validateRecord(packet: RecordPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.decisions || !Array.isArray(content.decisions) || content.decisions.length === 0)
      errors.push('RecordPacket: decisions must be a non-empty array');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate gate packet content
   */
  static validateGate(packet: GatePacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.gate_id || !['premortem', 'vibe', 'scenario', 'policy'].includes(content.gate_id))
      errors.push(`GatePacket: invalid gate_id: ${content.gate_id}`);

    if (!content.result || !['pass', 'fail', 'warn'].includes(content.result))
      errors.push(`GatePacket: invalid result: ${content.result}`);

    if (!content.checks || !Array.isArray(content.checks))
      errors.push('GatePacket: checks must be an array');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate council packet content
   */
  static validateCouncil(packet: CouncilPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.council_id) errors.push('CouncilPacket: Missing council_id');

    if (!content.votes || !Array.isArray(content.votes) || content.votes.length === 0)
      errors.push('CouncilPacket: votes must be a non-empty array');
    else {
      for (const vote of content.votes) {
        if (!vote.member_id) errors.push('CouncilPacket: vote missing member_id');
        if (!vote.vote || !['permit', 'block', 'revise'].includes(vote.vote))
          errors.push(`CouncilPacket: invalid vote: ${vote.vote}`);
        if (!vote.rationale) errors.push('CouncilPacket: vote missing rationale');
      }
    }

    if (!content.verdict || !['permit', 'block', 'revise'].includes(content.verdict))
      errors.push(`CouncilPacket: invalid verdict: ${content.verdict}`);

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate drift packet content
   */
  static validateDrift(packet: DriftPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (
      !content.drift_type ||
      !['behavioral', 'policy', 'data', 'corpus'].includes(content.drift_type)
    )
      errors.push(`DriftPacket: invalid drift_type: ${content.drift_type}`);

    if (!content.severity || !['low', 'medium', 'high', 'critical'].includes(content.severity))
      errors.push(`DriftPacket: invalid severity: ${content.severity}`);

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate rollback packet content
   */
  static validateRollback(packet: RollbackPacket): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envelopeValid = this.validateEnvelope(packet);
    errors.push(...envelopeValid.errors);

    const { content } = packet;

    if (!content.reason) errors.push('RollbackPacket: Missing reason');

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Dispatch validation to type-specific validator
   */
  static validate(packet: GovernancePacket): ValidationResult {
    const envelopeValid = this.validateEnvelope(packet);
    if (!envelopeValid.valid) return envelopeValid;

    switch (packet.packet_type) {
      case 'research':
        return this.validateResearch(packet as ResearchPacket);
      case 'plan':
        return this.validatePlan(packet as PlanPacket);
      case 'implement':
        return this.validateImplement(packet as ImplementPacket);
      case 'validate':
        return this.validateValidate(packet as ValidatePacket);
      case 'record':
        return this.validateRecord(packet as RecordPacket);
      case 'gate':
        return this.validateGate(packet as GatePacket);
      case 'council':
        return this.validateCouncil(packet as CouncilPacket);
      case 'evolution_step':
        return { valid: envelopeValid.valid, errors: envelopeValid.errors, warnings: [] };
      case 'drift':
        return this.validateDrift(packet as DriftPacket);
      case 'rollback':
        return this.validateRollback(packet as RollbackPacket);
      default:
        return {
          valid: false,
          errors: [`Unknown packet type: ${packet.packet_type}`],
          warnings: [],
        };
    }
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  private static isValidUUID(value: any): boolean {
    if (typeof value !== 'string') return false;
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    return uuidRegex.test(value);
  }

  private static isValidPacketType(value: any): boolean {
    return [
      'research',
      'plan',
      'implement',
      'validate',
      'record',
      'gate',
      'council',
      'evolution_step',
      'drift',
      'rollback',
    ].includes(value);
  }

  private static isValidPhase(value: any): boolean {
    return ['discovery', 'harvester', 'orchestrate', 'execution', 'synthesize', 'audit', 'evolution'].includes(value);
  }

  private static isValidISO8601(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      const date = new Date(value);
      return date.toISOString() === value || !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
}
