/**
 * CIC Governance Memory Store — Phase 24.3
 * Extends MemoryStore with governance packet collections
 *
 * Collections:
 * - packets: all GovernancePacket instances
 * - rails: all PolicyRail definitions
 * - snapshots: state snapshots for rollback
 * - decay_queue: packets marked for decay processing
 */

import { GovernancePacket, PacketType, CICPhase } from './packet-types';
import { PolicyRail, DecayCandidate, DecayConfig } from './types';
import { DecayLogic } from './decay-logic';
import { v4 as uuidv4 } from 'uuid';

export interface Snapshot {
  snapshot_id: string;
  timestamp: string;
  phase: CICPhase;
  packet_count: number;
  rail_count: number;
  checksum: string;
  decayed_packets: string[];
  reason: string;
}

export interface QueryFilter {
  packet_type?: PacketType;
  run_id?: string;
  phase?: CICPhase;
  rail_id?: string;
  agent_id?: string;
  after_timestamp?: string;
  before_timestamp?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  packets: GovernancePacket[];
  total_count: number;
  query_time_ms: number;
}

export class GovernanceMemoryStore {
  private packets: Map<string, GovernancePacket> = new Map();
  private rails: Map<string, PolicyRail> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private decay_queue: Map<string, DecayCandidate> = new Map();

  // Indexes for <100ms queries
  private index_by_packet_type: Map<PacketType, Set<string>> = new Map();
  private index_by_run_id: Map<string, Set<string>> = new Map();
  private index_by_phase: Map<CICPhase, Set<string>> = new Map();
  private index_by_rail: Map<string, Set<string>> = new Map();
  private index_by_agent: Map<string, Set<string>> = new Map();

  private decayLogic: DecayLogic;

  constructor(decayConfig?: DecayConfig) {
    this.decayLogic = new DecayLogic(decayConfig);
  }

  /**
   * Store a governance packet
   */
  storePacket(packet: GovernancePacket): void {
    const packetId = packet.packet_id;

    // Store packet
    this.packets.set(packetId, packet);

    // Update indexes
    this.addToIndex(this.index_by_packet_type, packet.packet_type, packetId);
    this.addToIndex(this.index_by_run_id, packet.run_id, packetId);
    this.addToIndex(this.index_by_phase, packet.phase, packetId);
    this.addToIndex(this.index_by_agent, packet.agent_id, packetId);

    // Index by rails in policy context
    if (packet.policy_context) {
      const rails = [
        ...(packet.policy_context.global || []),
        ...(packet.policy_context.domain || []),
        ...(packet.policy_context.phase || []),
      ];
      for (const rail of rails) {
        this.addToIndex(this.index_by_rail, rail, packetId);
      }
    }
  }

  /**
   * Store a policy rail
   */
  storeRail(rail: PolicyRail): void {
    this.rails.set(rail.rail_id, rail);
  }

  /**
   * Create a snapshot of current state (before applying changes/rollback)
   */
  createSnapshot(phase: CICPhase, reason: string): Snapshot {
    const snapshot: Snapshot = {
      snapshot_id: uuidv4(),
      timestamp: new Date().toISOString(),
      phase,
      packet_count: this.packets.size,
      rail_count: this.rails.size,
      checksum: this.computeChecksum(),
      decayed_packets: Array.from(this.decay_queue.values()).map(c => c.packet_id),
      reason,
    };

    this.snapshots.set(snapshot.snapshot_id, snapshot);
    return snapshot;
  }

  /**
   * Rollback to a previous snapshot
   * Returns list of packets that were invalidated
   */
  rollbackToSnapshot(snapshotId: string): string[] {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // Track which packets to invalidate (those added since snapshot)
    const invalidated: string[] = [];
    for (const [packetId, packet] of this.packets) {
      if (new Date(packet.timestamp) > new Date(snapshot.timestamp)) {
        invalidated.push(packetId);
      }
    }

    // Clear indexes and rebuild to match snapshot state
    this.clearIndexes();

    // Remove packets added after snapshot
    for (const packetId of invalidated) {
      this.packets.delete(packetId);
    }

    // Rebuild indexes for remaining packets
    for (const [, packet] of this.packets) {
      this.addToIndex(this.index_by_packet_type, packet.packet_type, packet.packet_id);
      this.addToIndex(this.index_by_run_id, packet.run_id, packet.packet_id);
      this.addToIndex(this.index_by_phase, packet.phase, packet.packet_id);
      this.addToIndex(this.index_by_agent, packet.agent_id, packet.packet_id);

      if (packet.policy_context) {
        const rails = [
          ...(packet.policy_context.global || []),
          ...(packet.policy_context.domain || []),
          ...(packet.policy_context.phase || []),
        ];
        for (const rail of rails) {
          this.addToIndex(this.index_by_rail, rail, packet.packet_id);
        }
      }
    }

    return invalidated;
  }

  /**
   * Scan packets for decay and queue them
   */
  scanForDecayPatterns(): DecayCandidate[] {
    const candidates = this.decayLogic.scanForDecayCandidates(
      Array.from(this.packets.values())
    );

    for (const candidate of candidates) {
      this.decay_queue.set(candidate.packet_id, candidate);
    }

    return candidates;
  }

  /**
   * Mark packet as decayed and remove from main store
   */
  applyDecayToPacket(packetId: string): void {
    const candidate = this.decay_queue.get(packetId);
    if (!candidate) return;

    // Apply decay via DecayLogic
    this.decayLogic.applyDecay([candidate]);

    // Remove from main store and indexes
    this.packets.delete(packetId);
    this.removeFromAllIndexes(packetId);

    // Keep in decay_queue as record (or remove if full cleanup desired)
    // this.decay_queue.delete(packetId);
  }

  /**
   * Pin a packet (prevent decay)
   */
  pinPacket(packetId: string): void {
    if (this.decay_queue.has(packetId)) {
      const candidate = this.decay_queue.get(packetId)!;
      this.decayLogic.pinPacket(candidate.packet_id);
      this.decay_queue.delete(packetId);
    }
  }

  /**
   * Restore a pinned packet to active state
   */
  restorePacket(packetId: string): void {
    this.decayLogic.restorePacket(packetId);
    // Packet remains in main store, not re-queued for decay
  }

  /**
   * Query packets with filters (optimized via indexes)
   */
  queryPackets(filter: QueryFilter): QueryResult {
    const startTime = Date.now();

    let candidateIds: Set<string>;

    // Use most selective index
    if (filter.packet_type) {
      candidateIds = this.index_by_packet_type.get(filter.packet_type) || new Set();
    } else if (filter.run_id) {
      candidateIds = this.index_by_run_id.get(filter.run_id) || new Set();
    } else if (filter.phase) {
      candidateIds = this.index_by_phase.get(filter.phase) || new Set();
    } else if (filter.rail_id) {
      candidateIds = this.index_by_rail.get(filter.rail_id) || new Set();
    } else if (filter.agent_id) {
      candidateIds = this.index_by_agent.get(filter.agent_id) || new Set();
    } else {
      candidateIds = new Set(this.packets.keys());
    }

    // Apply secondary filters
    let results = Array.from(candidateIds)
      .map(id => this.packets.get(id)!)
      .filter(packet => {
        if (filter.packet_type && packet.packet_type !== filter.packet_type) return false;
        if (filter.run_id && packet.run_id !== filter.run_id) return false;
        if (filter.phase && packet.phase !== filter.phase) return false;
        if (filter.agent_id && packet.agent_id !== filter.agent_id) return false;
        if (filter.after_timestamp && packet.timestamp <= filter.after_timestamp) return false;
        if (filter.before_timestamp && packet.timestamp >= filter.before_timestamp) return false;
        return true;
      });

    // Sort by timestamp
    results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 1000;
    const paginated = results.slice(offset, offset + limit);

    const queryTime = Date.now() - startTime;

    return {
      packets: paginated,
      total_count: results.length,
      query_time_ms: queryTime,
    };
  }

  /**
   * Get full trace for a run (all packets in order)
   */
  getPacketTraceByRun(runId: string): GovernancePacket[] {
    return this.queryPackets({ run_id: runId }).packets;
  }

  /**
   * Get all packets of a specific type
   */
  getPacketsByType(packetType: PacketType): GovernancePacket[] {
    return this.queryPackets({ packet_type: packetType }).packets;
  }

  /**
   * Get all packets affected by a rail
   */
  getPacketsByRail(railId: string): GovernancePacket[] {
    return this.queryPackets({ rail_id: railId }).packets;
  }

  /**
   * Get packet by ID
   */
  getPacket(packetId: string): GovernancePacket | undefined {
    return this.packets.get(packetId);
  }

  /**
   * Get all stored rails
   */
  getRails(): PolicyRail[] {
    return Array.from(this.rails.values());
  }

  /**
   * Get snapshots in reverse chronological order
   */
  getSnapshots(limit?: number): Snapshot[] {
    const snapshots = Array.from(this.snapshots.values());
    snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? snapshots.slice(0, limit) : snapshots;
  }

  /**
   * Get decay queue
   */
  getDecayQueue(): DecayCandidate[] {
    return Array.from(this.decay_queue.values());
  }

  /**
   * Get stats about current state
   */
  getStats(): {
    total_packets: number;
    total_rails: number;
    total_snapshots: number;
    decay_queue_size: number;
    packets_by_type: Record<PacketType, number>;
    packets_by_phase: Record<CICPhase, number>;
  } {
    const stats = {
      total_packets: this.packets.size,
      total_rails: this.rails.size,
      total_snapshots: this.snapshots.size,
      decay_queue_size: this.decay_queue.size,
      packets_by_type: {} as Record<PacketType, number>,
      packets_by_phase: {} as Record<CICPhase, number>,
    };

    for (const [type, ids] of this.index_by_packet_type) {
      (stats.packets_by_type as any)[type] = ids.size;
    }

    for (const [phase, ids] of this.index_by_phase) {
      (stats.packets_by_phase as any)[phase] = ids.size;
    }

    return stats;
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  private addToIndex(index: Map<any, Set<string>>, key: any, value: string): void {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key)!.add(value);
  }

  private removeFromAllIndexes(packetId: string): void {
    for (const set of this.index_by_packet_type.values()) set.delete(packetId);
    for (const set of this.index_by_run_id.values()) set.delete(packetId);
    for (const set of this.index_by_phase.values()) set.delete(packetId);
    for (const set of this.index_by_rail.values()) set.delete(packetId);
    for (const set of this.index_by_agent.values()) set.delete(packetId);
  }

  private clearIndexes(): void {
    this.index_by_packet_type.clear();
    this.index_by_run_id.clear();
    this.index_by_phase.clear();
    this.index_by_rail.clear();
    this.index_by_agent.clear();
  }

  private computeChecksum(): string {
    const crypto = require('crypto');
    const content = JSON.stringify({
      packet_ids: Array.from(this.packets.keys()).sort(),
      rail_ids: Array.from(this.rails.keys()).sort(),
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
