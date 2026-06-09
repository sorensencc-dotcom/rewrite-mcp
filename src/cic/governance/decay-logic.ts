/**
 * CIC Decay / Pruning Logic
 * Phase 24.1: Hybrid Decay Model
 *
 * Autonomous heuristic decay triggers:
 * - Age: packets older than threshold
 * - Low usage: packets not referenced recently
 * - Contradiction: packets contradicted by council verdicts
 * - Drift signals: packets associated with drift windows
 * - Quality score: packets with confidence below threshold
 *
 * Operator override: pin, force decay, restore, adjust thresholds
 */

import { DecayCandidate, DecayTrigger, DecayConfig, GovernanceOverride, OverrideType } from './types';

export class DecayLogic {
  private config: DecayConfig;
  private overrides: Map<string, GovernanceOverride> = new Map();

  constructor(config: Partial<DecayConfig> = {}) {
    this.config = {
      age_threshold_days: 30,
      usage_threshold_runs: 10,
      quality_threshold: 0.6,
      auto_decay_enabled: true,
      operator_override_enabled: true,
      ...config,
    };
  }

  /**
   * Scan packets for decay candidates
   */
  scanForDecayCandidates(
    packets: Array<{
      packet_id: string;
      created_at: string;
      last_used?: string;
      usage_count: number;
      confidence: number;
      contradicted?: boolean;
      drift_associated?: boolean;
    }>,
  ): DecayCandidate[] {
    const now = new Date();
    const candidates: DecayCandidate[] = [];

    for (const packet of packets) {
      const triggers: DecayTrigger[] = [];

      // Age trigger
      const createdDate = new Date(packet.created_at);
      const ageDays = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (ageDays > this.config.age_threshold_days) {
        triggers.push(DecayTrigger.AGE);
      }

      // Low usage trigger
      if (packet.usage_count < this.config.usage_threshold_runs) {
        triggers.push(DecayTrigger.LOW_USAGE);
      }

      // Contradiction trigger
      if (packet.contradicted === true) {
        triggers.push(DecayTrigger.CONTRADICTION);
      }

      // Drift trigger
      if (packet.drift_associated === true) {
        triggers.push(DecayTrigger.DRIFT);
      }

      // Quality trigger
      if (packet.confidence < this.config.quality_threshold) {
        triggers.push(DecayTrigger.LOW_QUALITY);
      }

      // Add to candidates if triggers found
      if (triggers.length > 0) {
        const lastUsedDate = packet.last_used
          ? new Date(packet.last_used)
          : createdDate;

        candidates.push({
          packet_id: packet.packet_id,
          triggers,
          age_days: ageDays,
          usage_count: packet.usage_count,
          last_used: lastUsedDate.toISOString(),
          confidence: packet.confidence,
          suggested_action:
            triggers.length >= 3 ? 'decay' : triggers.length === 2 ? 'review' : 'pin',
        });
      }
    }

    return candidates;
  }

  /**
   * Apply decay to a candidate (autonomous or operator-driven)
   */
  applyDecay(
    packet_id: string,
    trigger_reasons: string[],
    operator_id?: string,
  ): {
    success: boolean;
    reason: string;
    decayed_at: string;
  } {
    // Check operator overrides
    const override = this.overrides.get(packet_id);
    if (override && override.override_type === OverrideType.DECAY) {
      return {
        success: false,
        reason: `Decay blocked by operator override: ${override.reason}`,
        decayed_at: new Date().toISOString(),
      };
    }

    if (!this.config.auto_decay_enabled && !operator_id) {
      return {
        success: false,
        reason: 'Auto-decay disabled; requires operator approval',
        decayed_at: new Date().toISOString(),
      };
    }

    // Decay is allowed
    return {
      success: true,
      reason: `Decayed due to: ${trigger_reasons.join(', ')}`,
      decayed_at: new Date().toISOString(),
    };
  }

  /**
   * Pin a packet (prevent decay)
   */
  pinPacket(
    packet_id: string,
    reason: string,
    operator_id: string,
    expires?: string,
  ): GovernanceOverride {
    const override: GovernanceOverride = {
      override_id: `override-${packet_id}-${Date.now()}`,
      override_type: OverrideType.DECAY,
      reason: `Pin: ${reason}`,
      target_id: packet_id,
      operator_id,
      timestamp: new Date().toISOString(),
      expires,
    };

    this.overrides.set(packet_id, override);
    return override;
  }

  /**
   * Restore a decayed packet
   */
  restorePacket(
    packet_id: string,
    reason: string,
    operator_id: string,
  ): GovernanceOverride {
    const override: GovernanceOverride = {
      override_id: `restore-${packet_id}-${Date.now()}`,
      override_type: OverrideType.PACKET,
      reason: `Restore: ${reason}`,
      target_id: packet_id,
      operator_id,
      timestamp: new Date().toISOString(),
    };

    this.overrides.set(packet_id, override);
    return override;
  }

  /**
   * Adjust decay thresholds
   */
  adjustThreshold(key: keyof DecayConfig, value: number): void {
    if (key in this.config) {
      (this.config[key] as number) = value;
    }
  }

  /**
   * Get all active overrides
   */
  getActiveOverrides(): GovernanceOverride[] {
    const now = new Date();
    const active: GovernanceOverride[] = [];

    for (const override of this.overrides.values()) {
      if (override.expires && new Date(override.expires) < now) {
        this.overrides.delete(override.target_id);
        continue;
      }
      active.push(override);
    }

    return active;
  }

  /**
   * Get decay config
   */
  getConfig(): DecayConfig {
    return { ...this.config };
  }
}
