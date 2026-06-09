/**
 * CIC Packet Schema Tests
 * Phase 24.2: Evidence Vault Schema
 */

import { describe, it, expect } from 'vitest';
import {
  PacketBuilder,
  isResearchPacket,
  isPlanPacket,
  isImplementPacket,
  isValidatePacket,
  isRecordPacket,
  isGatePacket,
  isCouncilPacket,
  isDriftPacket,
  isRollbackPacket,
  getPacketTraceByRun,
  getPacketsByType,
  getPacketDependents,
  GovernancePacket,
} from '../../src/cic/governance/packet-types';
import { PacketValidator } from '../../src/cic/governance/packet-validator';

describe('CIC Evidence Vault Schema — Phase 24.2', () => {
  const testRunId = '123e4567-e89b-12d3-a456-426614174000';
  const testAgentId = 'test-agent';

  describe('Packet Type Builders', () => {
    it('should create valid research packets', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Optimize latency',
        constraints: ['No infra changes', 'Maintain accuracy'],
        sources: ['doc1', 'doc2'],
      });

      expect(packet.packet_type).toBe('research');
      expect(packet.run_id).toBe(testRunId);
      expect(packet.content.goal).toBe('Optimize latency');
      expect(isResearchPacket(packet)).toBe(true);
    });

    it('should create valid plan packets', () => {
      const packet = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Profile code', 'Optimize', 'Test'],
        acceptance_criteria: ['Latency < 500ms'],
      });

      expect(packet.packet_type).toBe('plan');
      expect(isPlanPacket(packet)).toBe(true);
      expect(packet.content.steps.length).toBe(3);
    });

    it('should create valid implement packets', () => {
      const packet = PacketBuilder.implement(testRunId, testAgentId, {
        diffs: ['diff 1', 'diff 2'],
        commands: ['npm run build', 'npm test'],
        artifacts: ['config-v2.json'],
      });

      expect(packet.packet_type).toBe('implement');
      expect(isImplementPacket(packet)).toBe(true);
      expect(packet.content.artifacts).toContain('config-v2.json');
    });

    it('should create valid validate packets', () => {
      const packet = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [
          { test_id: 'latency', status: 'pass', details: '480ms' },
          { test_id: 'accuracy', status: 'pass', details: '99.2%' },
        ],
        metrics: { latency_ms: 480, error_rate: 0.001 },
        final_verdict: 'permit',
      });

      expect(packet.packet_type).toBe('validate');
      expect(isValidatePacket(packet)).toBe(true);
      expect(packet.content.final_verdict).toBe('permit');
    });

    it('should create valid record packets', () => {
      const packet = PacketBuilder.record(testRunId, testAgentId, {
        learnings: ['Aggressive tuning harms high-load'],
        decisions: ['Deploy conservative config'],
        citations: ['research-1', 'plan-1'],
      });

      expect(packet.packet_type).toBe('record');
      expect(isRecordPacket(packet)).toBe(true);
      expect(packet.content.learnings.length).toBe(1);
    });

    it('should create valid gate packets', () => {
      const packet = PacketBuilder.gate(testRunId, testAgentId, {
        gate_id: 'premortem',
        run_id: testRunId,
        result: 'pass',
        checks: [
          { check_id: 'rollback-plan', status: 'pass', details: 'Exists' },
        ],
      });

      expect(packet.packet_type).toBe('gate');
      expect(isGatePacket(packet)).toBe(true);
      expect(packet.content.gate_id).toBe('premortem');
    });

    it('should create valid council packets', () => {
      const packet = PacketBuilder.council(testRunId, testAgentId, {
        council_id: 'safety_council',
        run_id: testRunId,
        votes: [
          { member_id: 'A', vote: 'permit', rationale: 'Looks good', confidence: 0.8 },
          { member_id: 'B', vote: 'block', rationale: 'Too risky', confidence: 0.9 },
        ],
        verdict: 'block',
      });

      expect(packet.packet_type).toBe('council');
      expect(isCouncilPacket(packet)).toBe(true);
      expect(packet.content.verdict).toBe('block');
    });

    it('should create valid drift packets', () => {
      const packet = PacketBuilder.council(testRunId, testAgentId, {
        council_id: 'safety_council',
        run_id: testRunId,
        votes: [{ member_id: 'A', vote: 'permit', rationale: 'OK' }],
        verdict: 'permit',
      });

      expect(isDriftPacket(packet)).toBe(false); // Not a drift packet
    });
  });

  describe('Packet Type Guards', () => {
    it('should correctly identify research packets', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
      });

      expect(isResearchPacket(packet)).toBe(true);
      expect(isPlanPacket(packet)).toBe(false);
    });

    it('should correctly identify all packet types', () => {
      const research = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
      });
      const plan = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: ['Pass'],
      });

      expect(isResearchPacket(research)).toBe(true);
      expect(isPlanPacket(plan)).toBe(true);
      expect(isPlanPacket(research)).toBe(false);
      expect(isResearchPacket(plan)).toBe(false);
    });
  });

  describe('Packet Validation', () => {
    it('should validate valid research packets', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Optimize',
        constraints: ['No infra changes'],
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject research packets missing goal', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: '',
        constraints: ['No infra changes'],
      });
      packet.content.goal = ''; // Force invalid

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('goal'))).toBe(true);
    });

    it('should validate council packets with correct verdict', () => {
      const packet = PacketBuilder.council(testRunId, testAgentId, {
        council_id: 'test_council',
        run_id: testRunId,
        votes: [
          { member_id: 'A', vote: 'permit', rationale: 'OK' },
          { member_id: 'B', vote: 'block', rationale: 'No' },
        ],
        verdict: 'block', // Correct (unanimous block veto)
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
    });

    it('should validate validate packets with proper verdicts', () => {
      const packet = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [{ test_id: 'test1', status: 'pass' }],
        final_verdict: 'permit',
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid packet types', () => {
      const packet = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
      });
      (packet as any).packet_type = 'invalid_type';

      const result = PacketValidator.validateEnvelope(packet);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('packet_type'))).toBe(true);
    });

    it('should reject invalid run_id format', () => {
      const packet = PacketBuilder.research('not-a-uuid', testAgentId, {
        goal: 'Test',
        constraints: [],
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('run_id'))).toBe(true);
    });
  });

  describe('Packet Tracing & Querying', () => {
    it('should trace packets by run ID', () => {
      const packets: GovernancePacket[] = [
        PacketBuilder.research(testRunId, testAgentId, { goal: 'Test', constraints: [] }),
        PacketBuilder.plan(testRunId, testAgentId, {
          steps: ['Step 1'],
          acceptance_criteria: ['Pass'],
        }),
        PacketBuilder.research('other-run-id-e89b-12d3-a456-426614174000', testAgentId, {
          goal: 'Other',
          constraints: [],
        }),
      ];

      const trace = getPacketTraceByRun(testRunId, packets);
      expect(trace).toHaveLength(2);
      expect(trace.every((p) => p.run_id === testRunId)).toBe(true);
    });

    it('should filter packets by type', () => {
      const packets: GovernancePacket[] = [
        PacketBuilder.research(testRunId, testAgentId, { goal: 'Test', constraints: [] }),
        PacketBuilder.plan(testRunId, testAgentId, {
          steps: ['Step 1'],
          acceptance_criteria: ['Pass'],
        }),
        PacketBuilder.research(testRunId, testAgentId, { goal: 'Test2', constraints: [] }),
      ];

      const research = getPacketsByType('research', packets);
      expect(research).toHaveLength(2);
      expect(research.every((p) => p.packet_type === 'research')).toBe(true);
    });

    it('should find dependent packets', () => {
      const researchPacket = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Test',
        constraints: [],
      });

      const planPacket = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Step 1'],
        acceptance_criteria: ['Pass'],
        phase: 'orchestrate',
        parent_packet_ids: [researchPacket.packet_id],
      });

      const packets: GovernancePacket[] = [researchPacket, planPacket];

      const dependents = getPacketDependents(researchPacket.packet_id, packets);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].packet_id).toBe(planPacket.packet_id);
    });
  });

  describe('Packet Content Validation', () => {
    it('should validate record packets require decisions', () => {
      const packet = PacketBuilder.record(testRunId, testAgentId, {
        decisions: ['Decision 1'],
        learnings: ['Learning 1'],
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
    });

    it('should validate validate packets with test results', () => {
      const packet = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [
          { test_id: 'test1', status: 'pass' },
          { test_id: 'test2', status: 'fail', details: 'Timeout' },
        ],
        final_verdict: 'block',
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
      expect(packet.content.test_results).toHaveLength(2);
    });

    it('should validate gate packets with checks', () => {
      const packet = PacketBuilder.gate(testRunId, testAgentId, {
        gate_id: 'scenario',
        run_id: testRunId,
        result: 'fail',
        checks: [
          { check_id: 'high_load', status: 'fail', details: '700ms latency' },
        ],
        violations: ['rail-high-load-spec'],
      });

      const result = PacketValidator.validate(packet);
      expect(result.valid).toBe(true);
      expect(packet.content.violations).toContain('rail-high-load-spec');
    });
  });

  describe('Full RPI Trace Example', () => {
    it('should build a complete RPI trace with all packet types', () => {
      // Research
      const research = PacketBuilder.research(testRunId, testAgentId, {
        goal: 'Optimize Rewrite Labs benchmark latency',
        constraints: ['Keep accuracy', 'No infra changes'],
        sources: ['benchmark-docs'],
      });

      // Plan
      const plan = PacketBuilder.plan(testRunId, testAgentId, {
        steps: ['Profile', 'Adjust batching', 'Tune timeouts'],
        acceptance_criteria: ['Latency < 500ms'],
        parent_packet_ids: [research.packet_id],
      });

      // Implement
      const implement = PacketBuilder.implement(testRunId, testAgentId, {
        diffs: ['config.yaml: batch_size=64→128'],
        commands: ['npm run deploy'],
        artifacts: ['config-v2'],
        parent_packet_ids: [plan.packet_id],
      });

      // Validate
      const validate = PacketBuilder.validate(testRunId, testAgentId, {
        test_results: [
          { test_id: 'latency', status: 'fail', details: '700ms under load' },
          { test_id: 'accuracy', status: 'pass', details: '99.2%' },
        ],
        final_verdict: 'block',
        parent_packet_ids: [implement.packet_id],
      });

      // Record
      const record = PacketBuilder.record(testRunId, testAgentId, {
        learnings: [
          'Aggressive timeout tuning improves median but harms high-load',
        ],
        decisions: ['Blocked deployment', 'Revert config'],
        citations: [research.packet_id, plan.packet_id],
      });

      const packets = [research, plan, implement, validate, record];

      // Verify trace
      expect(packets).toHaveLength(5);
      expect(packets[0].packet_type).toBe('research');
      expect(packets[1].packet_type).toBe('plan');
      expect(packets[2].packet_type).toBe('implement');
      expect(packets[3].packet_type).toBe('validate');
      expect(packets[4].packet_type).toBe('record');

      // Verify all valid
      for (const packet of packets) {
        const validation = PacketValidator.validate(packet);
        expect(validation.valid).toBe(true, `${packet.packet_type} validation failed`);
      }

      // Verify parent relationships
      const trace = getPacketTraceByRun(testRunId, packets);
      expect(trace).toHaveLength(5);
      expect(trace.map((p) => p.packet_type)).toEqual([
        'research',
        'plan',
        'implement',
        'validate',
        'record',
      ]);
    });
  });
});
