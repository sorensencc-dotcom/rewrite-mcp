/**
 * CIC Phase Contracts Tests
 * Phase 24.4: Phase API Contracts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RunContext } from '../../src/cic/governance/run-context';
import {
  DiscoveryPhaseContract,
  HarvesterPhaseContract,
  OrchestratePhaseContract,
  ExecutionPhaseContract,
  SynthesizePhaseContract,
  AuditPhaseContract,
  EvolutionPhaseContract,
  GateOutput,
  CouncilVerdictOutput,
} from '../../src/cic/governance/phase-contracts';
import { PolicyRails, DEFAULT_HARD_SAFETY_RAILS } from '../../src/cic/governance/policy-rails';

describe('CIC Phase Contracts — Phase 24.4', () => {
  const testAgentId = 'test-agent';
  let context: RunContext;
  let railsEngine: PolicyRails;

  beforeEach(() => {
    context = new RunContext({
      agent_id: testAgentId,
      initial_phase: 'discovery',
    });
    railsEngine = new PolicyRails();
    for (const rail of DEFAULT_HARD_SAFETY_RAILS) {
      railsEngine.registerRail(rail);
    }
  });

  describe('RunContext', () => {
    it('should create run context with unique run_id', () => {
      const ctx1 = new RunContext({ agent_id: 'agent1', initial_phase: 'discovery' });
      const ctx2 = new RunContext({ agent_id: 'agent2', initial_phase: 'discovery' });

      expect(ctx1['run_id']).toBeDefined();
      expect(ctx2['run_id']).toBeDefined();
      expect(ctx1['run_id']).not.toBe(ctx2['run_id']);
    });

    it('should track phase transitions', () => {
      expect(context.getPhase()).toBe('discovery');

      context.transitionToPhase('harvester');
      expect(context.getPhase()).toBe('harvester');

      context.transitionToPhase('orchestrate');
      expect(context.getPhase()).toBe('orchestrate');

      const transitions = context.getPhaseTransitions();
      expect(transitions).toHaveLength(2);
      expect(transitions[0].from_phase).toBe('discovery');
      expect(transitions[0].to_phase).toBe('harvester');
    });

    it('should store and retrieve packets', () => {
      const research = DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test goal',
        constraints: ['No infra changes'],
      });

      expect(context.getPackets()).toHaveLength(1);
      expect(context.getResearchPacket()).toBeDefined();
      expect(context.getResearchPacket()?.packet_id).toBe(research.packet_id);
    });

    it('should get packets by type', () => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });

      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Step 1'],
        acceptance_criteria: ['Pass'],
      });

      const research = context.getPacketsByType('research');
      const plans = context.getPacketsByType('plan');

      expect(research).toHaveLength(1);
      expect(plans).toHaveLength(1);
    });

    it('should get run summary', () => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });

      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: [],
        acceptance_criteria: [],
      });

      const summary = context.getSummary();

      expect(summary.run_id).toBeDefined();
      expect(summary.agent_id).toBe(testAgentId);
      expect(summary.current_phase).toBe('orchestrate');
      expect(summary.total_packets).toBe(2);
      expect(summary.packet_types.research).toBe(1);
      expect(summary.packet_types.plan).toBe(1);
    });
  });

  describe('Discovery Phase', () => {
    it('should emit research packet', () => {
      const research = DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Optimize latency',
        constraints: ['Keep accuracy', 'No infra changes'],
        sources: ['benchmark-docs'],
      });

      expect(research.packet_type).toBe('research');
      expect(research.content.goal).toBe('Optimize latency');
      expect(research.phase).toBe('discovery');
      expect(context.getResearchPacket()).toBeDefined();
    });

    it('discovery contract warns if no research packet at exit', () => {
      const contract = new DiscoveryPhaseContract();
      expect(() => contract.onExit(context)).not.toThrow();
      // Warning is logged but doesn't fail
    });
  });

  describe('Orchestrate Phase', () => {
    beforeEach(() => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });
      context.transitionToPhase('orchestrate');
    });

    it('should emit plan packet with research parent', () => {
      const plan = OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Profile', 'Optimize'],
        acceptance_criteria: ['Latency < 500ms'],
      });

      expect(plan.packet_type).toBe('plan');
      expect(plan.phase).toBe('orchestrate');
      expect(plan.parent_packet_ids).toHaveLength(1);
      expect(plan.parent_packet_ids![0]).toBe(context.getResearchPacket()!.packet_id);
    });

    it('should invoke premortem gate', async () => {
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Step 1'],
        acceptance_criteria: [],
      });

      const gateOutput = await OrchestratePhaseContract.invokePremortemGate(context, railsEngine);

      expect(gateOutput.gate_id).toBe('premortem');
      expect(['pass', 'fail', 'warn']).toContain(gateOutput.result);
      expect(gateOutput.checks.length).toBeGreaterThan(0);
    });

    it('should invoke vibe gate (conservative plan)', async () => {
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Carefully adjust config', 'Test thoroughly'],
        acceptance_criteria: [],
      });

      const gateOutput = await OrchestratePhaseContract.invokeVibeGate(context);

      expect(gateOutput.gate_id).toBe('vibe');
      expect(gateOutput.result).toBe('pass'); // Conservative plan
    });

    it('should invoke vibe gate (aggressive plan)', async () => {
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Aggressively optimize timeout', 'Force deployment'],
        acceptance_criteria: [],
      });

      const gateOutput = await OrchestratePhaseContract.invokeVibeGate(context);

      expect(gateOutput.gate_id).toBe('vibe');
      expect(gateOutput.result).toBe('warn'); // Aggressive plan
    });
  });

  describe('Execution Phase', () => {
    beforeEach(() => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });
      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Step 1'],
        acceptance_criteria: [],
      });
      context.transitionToPhase('execution');
    });

    it('should emit implement packet with plan parent', () => {
      const implement = ExecutionPhaseContract.emitImplementPacket(context, {
        diffs: ['config: timeout=3000→5000'],
        commands: ['npm run deploy'],
        artifacts: ['config-v2.json'],
      });

      expect(implement.packet_type).toBe('implement');
      expect(implement.phase).toBe('execution');
      expect(implement.parent_packet_ids).toHaveLength(1);
      expect(implement.parent_packet_ids![0]).toBe(context.getPlanPacket()!.packet_id);
    });
  });

  describe('Synthesize Phase', () => {
    beforeEach(() => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });
      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: [],
        acceptance_criteria: [],
      });
      context.transitionToPhase('execution');
      ExecutionPhaseContract.emitImplementPacket(context, {
        diffs: [],
        commands: [],
      });
      context.transitionToPhase('synthesize');
    });

    it('should emit validate packet with implement parent', () => {
      const validate = SynthesizePhaseContract.emitValidatePacket(context, {
        test_results: [
          { test_id: 'latency', status: 'pass', details: '480ms' },
          { test_id: 'accuracy', status: 'pass', details: '99.2%' },
        ],
        metrics: { latency_ms: 480 },
        final_verdict: 'revise', // Placeholder
      });

      expect(validate.packet_type).toBe('validate');
      expect(validate.phase).toBe('synthesize');
      expect(validate.parent_packet_ids).toHaveLength(1);
      expect(validate.parent_packet_ids![0]).toBe(context.getImplementPacket()!.packet_id);
    });
  });

  describe('Audit Phase', () => {
    beforeEach(() => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });
      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: [],
        acceptance_criteria: [],
      });
      context.transitionToPhase('execution');
      ExecutionPhaseContract.emitImplementPacket(context, {
        diffs: [],
        commands: [],
      });
      context.transitionToPhase('synthesize');
      SynthesizePhaseContract.emitValidatePacket(context, {
        test_results: [{ test_id: 'test1', status: 'pass' }],
        final_verdict: 'revise',
      });
      context.transitionToPhase('audit');
    });

    it('should invoke scenario gate (all tests pass)', async () => {
      const gateOutput = await AuditPhaseContract.invokeScenarioGate(context);

      expect(gateOutput.gate_id).toBe('scenario');
      expect(gateOutput.result).toBe('pass');
    });

    it('should invoke scenario gate (some tests fail)', async () => {
      // Add failed test
      const validate = context.getValidatePacket() as any;
      validate.content.test_results.push({ test_id: 'load_test', status: 'fail' });

      const gateOutput = await AuditPhaseContract.invokeScenarioGate(context);

      expect(gateOutput.gate_id).toBe('scenario');
      expect(gateOutput.result).toBe('fail');
    });

    it('should invoke policy gate', async () => {
      const gateOutput = await AuditPhaseContract.invokePolicyGate(context, railsEngine);

      expect(gateOutput.gate_id).toBe('policy');
      expect(['pass', 'fail', 'warn']).toContain(gateOutput.result);
    });

    it('should invoke safety council (all tests pass → permit)', async () => {
      const verdict = await AuditPhaseContract.invokeSafetyCouncil(context);

      expect(verdict.council_id).toBe('safety_council');
      expect(verdict.verdict).toBe('permit');
      expect(verdict.votes.length).toBeGreaterThan(0);
    });

    it('should invoke safety council (tests fail → block)', async () => {
      // Add failed test
      const validate = context.getValidatePacket() as any;
      validate.content.test_results = [
        { test_id: 'critical', status: 'fail', details: 'Critical failure' },
      ];

      const verdict = await AuditPhaseContract.invokeSafetyCouncil(context);

      expect(verdict.council_id).toBe('safety_council');
      expect(verdict.verdict).toBe('block');
    });
  });

  describe('Evolution Phase', () => {
    beforeEach(() => {
      DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Test',
        constraints: [],
      });
      context.transitionToPhase('orchestrate');
      OrchestratePhaseContract.emitPlanPacket(context, {
        steps: [],
        acceptance_criteria: [],
      });
      context.transitionToPhase('execution');
      ExecutionPhaseContract.emitImplementPacket(context, {
        diffs: [],
        commands: [],
      });
      context.transitionToPhase('synthesize');
      SynthesizePhaseContract.emitValidatePacket(context, {
        test_results: [{ test_id: 'test1', status: 'pass' }],
        final_verdict: 'permit',
      });
      context.transitionToPhase('evolution');
    });

    it('should emit record packet with citations', () => {
      const packetCountBefore = context.getPackets().length;

      const record = EvolutionPhaseContract.emitRecordPacket(context, {
        learnings: ['Timeout tuning improves median latency'],
        decisions: ['Deploy to production'],
      });

      expect(record.packet_type).toBe('record');
      expect(record.phase).toBe('evolution');
      // Citations should include all packets from before record was added
      expect(record.content.citations).toHaveLength(packetCountBefore);
    });
  });

  describe('Full RPI Flow', () => {
    it('should execute complete RPI trace from discovery to evolution', async () => {
      // Discovery
      const research = DiscoveryPhaseContract.emitResearchPacket(context, {
        goal: 'Optimize latency',
        constraints: ['Keep accuracy', 'No infra changes'],
      });
      expect(context.getPhase()).toBe('discovery');

      // Harvester (no packet emission in this test)
      context.transitionToPhase('harvester');

      // Orchestrate
      context.transitionToPhase('orchestrate');
      const plan = OrchestratePhaseContract.emitPlanPacket(context, {
        steps: ['Profile', 'Adjust batching'],
        acceptance_criteria: ['Latency < 500ms'],
      });
      const premortermGate = await OrchestratePhaseContract.invokePremortemGate(context, railsEngine);
      const vibeGate = await OrchestratePhaseContract.invokeVibeGate(context);

      // Execution
      context.transitionToPhase('execution');
      const implement = ExecutionPhaseContract.emitImplementPacket(context, {
        diffs: ['config.yaml: batch_size=64→128'],
        commands: ['npm run deploy'],
      });

      // Synthesize
      context.transitionToPhase('synthesize');
      const validate = SynthesizePhaseContract.emitValidatePacket(context, {
        test_results: [
          { test_id: 'latency', status: 'pass', details: '480ms' },
          { test_id: 'accuracy', status: 'pass', details: '99.2%' },
        ],
        metrics: { latency_ms: 480 },
        final_verdict: 'revise',
      });

      // Audit
      context.transitionToPhase('audit');
      const scenarioGate = await AuditPhaseContract.invokeScenarioGate(context);
      const policyGate = await AuditPhaseContract.invokePolicyGate(context, railsEngine);
      const councilVerdict = await AuditPhaseContract.invokeSafetyCouncil(context);

      // Evolution
      context.transitionToPhase('evolution');
      const record = EvolutionPhaseContract.emitRecordPacket(context, {
        learnings: ['Timeout tuning effective for median case'],
        decisions: ['Deploy aggressive config'],
      });

      // Verify complete trace
      const summary = context.getSummary();
      expect(summary.total_packets).toBeGreaterThanOrEqual(5); // research, plan, implement, validate, record
      expect(summary.packet_types.research).toBe(1);
      expect(summary.packet_types.plan).toBe(1);
      expect(summary.packet_types.implement).toBe(1);
      expect(summary.packet_types.validate).toBe(1);
      expect(summary.packet_types.record).toBe(1);

      // Verify parent relationships
      expect(plan.parent_packet_ids?.[0]).toBe(research.packet_id);
      expect(implement.parent_packet_ids?.[0]).toBe(plan.packet_id);
      expect(validate.parent_packet_ids?.[0]).toBe(implement.packet_id);
    });
  });
});
