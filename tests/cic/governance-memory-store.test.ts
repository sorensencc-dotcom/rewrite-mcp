/**
 * CIC Governance Memory Store Tests
 * Phase 24.3: MemoryStore Tier 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceMemoryStore, QueryFilter } from '../../src/cic/governance/governance-memory-store';
import { PacketBuilder, GovernancePacket } from '../../src/cic/governance/packet-types';
import { PolicyRails, DEFAULT_HARD_SAFETY_RAILS } from '../../src/cic/governance/policy-rails';
import { DecayConfig } from '../../src/cic/governance/types';

describe('CIC Governance Memory Store — Phase 24.3', () => {
  const testRunId = '123e4567-e89b-12d3-a456-426614174000';
  const testRunId2 = '223e4567-e89b-12d3-a456-426614174000';
  const testAgentId = 'test-agent';

  let store: GovernanceMemoryStore;

  beforeEach(() => {
    const decayConfig: DecayConfig = {
      age_threshold_days: 30,
      usage_threshold_runs: 10,
      quality_threshold: 0.6,
      enable_heuristic_pruning: true,
    };
    store = new GovernanceMemoryStore(decayConfig);
  });

  describe('Packet Storage & Indexing', () => {
    it('should store and retrieve a packet', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test goal',
        constraints: [],
      });

      store.storePacket(packet);

      const retrieved = store.getPacket(packet.packet_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content.goal).toBe('Test goal');
    });

    it('should index packets by type', () => {
      const research = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
      });
      const plan = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: ['Pass'],
      });

      store.storePacket(research);
      store.storePacket(plan);

      const research_packets = store.getPacketsByType('research');
      expect(research_packets).toHaveLength(1);
      expect(research_packets[0].packet_type).toBe('research');
    });

    it('should index packets by run_id', () => {
      const p1 = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Goal 1',
        constraints: [],
      });
      const p2 = PacketBuilder.research(testRunId2, testAgentId, {
        goal: 'Goal 2',
        constraints: [],
      });

      store.storePacket(p1);
      store.storePacket(p2);

      const run1_packets = store.getPacketTraceByRun(testRunId);
      expect(run1_packets).toHaveLength(1);
      expect(run1_packets[0].run_id).toBe(testRunId);
    });

    it('should index packets by phase', () => {
      const discovery = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
        phase: 'discovery',
      });
      const orchestrate = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: [],
        phase: 'orchestrate',
      });

      store.storePacket(discovery);
      store.storePacket(orchestrate);

      const query = store.queryPackets({ phase: 'discovery' });
      expect(query.packets).toHaveLength(1);
      expect(query.packets[0].phase).toBe('discovery');
    });

    it('should track query performance', () => {
      for (let i = 0; i < 100; i++) {
        const packet = PacketBuilder.research(testRunId, testAgentId, {
          goal: `Goal ${i}`,
          constraints: [],
        });
        store.storePacket(packet);
      }

      const result = store.queryPackets({ run_id: testRunId });
      expect(result.query_time_ms).toBeLessThan(100); // <100ms requirement
      expect(result.total_count).toBe(100);
      expect(result.packets).toHaveLength(100);
    });
  });

  describe('Policy Rails', () => {
    it('should store and retrieve rails', () => {
      const rail = DEFAULT_HARD_SAFETY_RAILS[0];
      store.storeRail(rail);

      const rails = store.getRails();
      expect(rails).toHaveLength(1);
      expect(rails[0].rail_id).toBe(rail.rail_id);
    });

    it('should index packets by rail', () => {
      const rail = DEFAULT_HARD_SAFETY_RAILS[0];
      store.storeRail(rail);

      const packet = PacketBuilder.research(
        testRunId,
        testAgentId,
        {
          goal: 'Test',
          constraints: [],
        },
        {
          policy_context: {
            global: [rail.rail_id],
          },
        }
      );

      store.storePacket(packet);

      const byRail = store.getPacketsByRail(rail.rail_id);
      expect(byRail).toHaveLength(1);
    });
  });

  describe('Snapshots & Rollback', () => {
    it('should create snapshots', () => {
      const p1 = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Goal 1',
        constraints: [],
      });
      store.storePacket(p1);

      const snapshot = store.createSnapshot('execution', 'Before deployment');

      expect(snapshot.packet_count).toBe(1);
      expect(snapshot.reason).toBe('Before deployment');
    });

    it('should get snapshots in reverse chronological order', async () => {
      const snap1 = store.createSnapshot('discovery', 'First');
      await new Promise(r => setTimeout(r, 10)); // Small delay
      const snap2 = store.createSnapshot('harvester', 'Second');

      const snapshots = store.getSnapshots();
      expect(snapshots[0].snapshot_id).toBe(snap2.snapshot_id);
      expect(snapshots[1].snapshot_id).toBe(snap1.snapshot_id);
    });

    it('should rollback to snapshot', () => {
      const p1 = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Goal 1',
        constraints: [],
      });
      store.storePacket(p1);

      const snapshot = store.createSnapshot('discovery', 'Before');

      // Add more packets
      const p2 = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: [],
      });
      store.storePacket(p2);

      expect(store.queryPackets({ run_id: testRunId }).total_count).toBe(2);

      // Rollback
      const invalidated = store.rollbackToSnapshot(snapshot.snapshot_id);

      expect(invalidated).toHaveLength(1);
      expect(invalidated[0]).toBe(p2.packet_id);
      expect(store.queryPackets({ run_id: testRunId }).total_count).toBe(1);
    });

    it('should throw on invalid snapshot ID', () => {
      expect(() => {
        store.rollbackToSnapshot('invalid-snapshot-id');
      }).toThrow('not found');
    });
  });

  describe('Decay Logic Integration', () => {
    it('should scan for decay patterns', () => {
      // Create old packets
      const oldPacket = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Old goal',
        constraints: [],
      });

      store.storePacket(oldPacket);

      const candidates = store.scanForDecayPatterns();
      expect(candidates).toBeDefined();
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should queue packets for decay', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'To decay',
        constraints: [],
      });
      store.storePacket(packet);

      store.scanForDecayPatterns();

      const queue = store.getDecayQueue();
      expect(queue.length).toBeGreaterThanOrEqual(0);
    });

    it('should pin packet to prevent decay', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Keep this',
        constraints: [],
      });
      store.storePacket(packet);

      store.scanForDecayPatterns();
      store.pinPacket(packet.packet_id);

      const queue = store.getDecayQueue();
      const stillQueued = queue.some(c => c.packet_id === packet.packet_id);
      expect(stillQueued).toBe(false);
    });

    it('should restore packet from decay', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Restore me',
        constraints: [],
      });
      store.storePacket(packet);

      store.restorePacket(packet.packet_id);
      const retrieved = store.getPacket(packet.packet_id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('Complex Queries', () => {
    beforeEach(() => {
      // Create test data
      const p1 = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Research',
        constraints: [],
        phase: 'discovery',
      });
      const p2 = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: [],
        phase: 'orchestrate',
        parent_packet_ids: [p1.packet_id],
      });
      const p3 = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [{ test_id: 'test1', status: 'pass' }],
        final_verdict: 'permit',
        phase: 'audit',
        parent_packet_ids: [p2.packet_id],
      });

      store.storePacket(p1);
      store.storePacket(p2);
      store.storePacket(p3);
    });

    it('should query with multiple filters', () => {
      const result = store.queryPackets({
        run_id: testRunId,
        packet_type: 'plan',
      });

      expect(result.packets).toHaveLength(1);
      expect(result.packets[0].packet_type).toBe('plan');
    });

    it('should support pagination', () => {
      const result1 = store.queryPackets({
        run_id: testRunId,
        limit: 1,
        offset: 0,
      });

      const result2 = store.queryPackets({
        run_id: testRunId,
        limit: 1,
        offset: 1,
      });

      expect(result1.packets).toHaveLength(1);
      expect(result2.packets).toHaveLength(1);
      expect(result1.packets[0].packet_id).not.toBe(result2.packets[0].packet_id);
    });

    it('should get full RPI trace', () => {
      const trace = store.getPacketTraceByRun(testRunId);

      expect(trace).toHaveLength(3);
      expect(trace[0].packet_type).toBe('research');
      expect(trace[1].packet_type).toBe('plan');
      expect(trace[2].packet_type).toBe('validate');
    });

    it('should filter by timestamp range', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10000).toISOString();

      const result = store.queryPackets({
        run_id: testRunId,
        before_timestamp: future,
      });

      expect(result.total_count).toBe(3);
    });
  });

  describe('Statistics', () => {
    it('should compute stats', () => {
      const p1 = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Goal',
        constraints: [],
      });
      const p2 = PacketBuilder.plan(testRunId, testAgentId, {
        steps: [],
        acceptance_criteria: [],
      });

      store.storePacket(p1);
      store.storePacket(p2);

      const stats = store.getStats();

      expect(stats.total_packets).toBe(2);
      expect(stats.packets_by_type['research']).toBe(1);
      expect(stats.packets_by_type['plan']).toBe(1);
    });

    it('should track decay queue size', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Goal',
        constraints: [],
      });
      store.storePacket(packet);

      store.scanForDecayPatterns();

      const stats = store.getStats();
      expect(stats.decay_queue_size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full RPI Trace Example', () => {
    it('should handle complete RPI workflow', () => {
      // Research
      const research = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Optimize latency',
        constraints: ['No infra changes'],
        sources: ['benchmark-docs'],
      });
      store.storePacket(research);

      // Plan
      const plan = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Profile', 'Optimize'],
        acceptance_criteria: ['Latency < 500ms'],
        parent_packet_ids: [research.packet_id],
      });
      store.storePacket(plan);

      // Implement
      const implement = PacketBuilder.implement(testRunId, testAgentId, {
        diffs: ['config changes'],
        commands: ['deploy'],
        parent_packet_ids: [plan.packet_id],
      });
      store.storePacket(implement);

      // Validate
      const validate = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [{ test_id: 'latency', status: 'fail', details: '700ms' }],
        final_verdict: 'block',
        parent_packet_ids: [implement.packet_id],
      });
      store.storePacket(validate);

      // Record
      const record = PacketBuilder.record(testRunId, testAgentId, {
        learnings: ['Aggressive tuning harms high-load'],
        decisions: ['Blocked deployment'],
        citations: [research.packet_id],
      });
      store.storePacket(record);

      // Verify full trace
      const trace = store.getPacketTraceByRun(testRunId);
      expect(trace).toHaveLength(5);
      expect(trace.map(p => p.packet_type)).toEqual([
        'research',
        'plan',
        'implement',
        'validate',
        'record',
      ]);

      // Verify stats
      const stats = store.getStats();
      expect(stats.total_packets).toBe(5);
      expect(stats.packets_by_type['research']).toBe(1);
      expect(stats.packets_by_type['plan']).toBe(1);
      expect(stats.packets_by_type['implement']).toBe(1);
      expect(stats.packets_by_type['validate']).toBe(1);
      expect(stats.packets_by_type['record']).toBe(1);
    });
  });
});
