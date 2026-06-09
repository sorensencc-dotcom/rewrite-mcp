/**
 * CIC Governance Model Tests
 * Phase 24.1: Governance Model Specification
 */

import { describe, it, expect } from 'vitest';
import { CouncilVoting } from '../../src/cic/governance/council-voting';
import { PolicyRails, DEFAULT_HARD_SAFETY_RAILS } from '../../src/cic/governance/policy-rails';
import { DecayLogic } from '../../src/cic/governance/decay-logic';
import {
  VoteVerdict,
  RailCategory,
  DecayTrigger,
  DecayConfig,
  CouncilVote,
  PolicyContext,
} from '../../src/cic/governance/types';

describe('CIC Governance Model — Phase 24.1', () => {
  describe('Decision 1: Council Voting (Unanimous Block, Majority Permit)', () => {
    it('should return BLOCK if any member votes block', () => {
      const votes: CouncilVote[] = [
        { member_id: 'A', vote: VoteVerdict.PERMIT, rationale: 'Looks good' },
        { member_id: 'B', vote: VoteVerdict.BLOCK, rationale: 'Too risky' },
        { member_id: 'C', vote: VoteVerdict.PERMIT, rationale: 'Acceptable' },
      ];

      const verdict = CouncilVoting.computeVerdict('council1', 'run1', votes);
      expect(verdict.verdict).toBe(VoteVerdict.BLOCK);
    });

    it('should return PERMIT if majority votes permit (no blocks)', () => {
      const votes: CouncilVote[] = [
        { member_id: 'A', vote: VoteVerdict.PERMIT, rationale: 'Good' },
        { member_id: 'B', vote: VoteVerdict.PERMIT, rationale: 'Fine' },
        { member_id: 'C', vote: VoteVerdict.REVISE, rationale: 'Needs work' },
      ];

      const verdict = CouncilVoting.computeVerdict('council1', 'run1', votes);
      expect(verdict.verdict).toBe(VoteVerdict.PERMIT);
    });

    it('should return REVISE if no unanimous block and no majority permit', () => {
      const votes: CouncilVote[] = [
        { member_id: 'A', vote: VoteVerdict.PERMIT, rationale: 'OK' },
        { member_id: 'B', vote: VoteVerdict.REVISE, rationale: 'Needs fixes' },
        { member_id: 'C', vote: VoteVerdict.REVISE, rationale: 'More work' },
      ];

      const verdict = CouncilVoting.computeVerdict('council1', 'run1', votes);
      expect(verdict.verdict).toBe(VoteVerdict.REVISE);
    });

    it('should validate verdicts correctly', () => {
      const votes: CouncilVote[] = [
        { member_id: 'A', vote: VoteVerdict.BLOCK, rationale: 'No' },
        { member_id: 'B', vote: VoteVerdict.PERMIT, rationale: 'Yes' },
      ];

      const verdict = CouncilVoting.computeVerdict('council1', 'run1', votes);
      const validation = CouncilVoting.validateVerdict(verdict);
      expect(validation.valid).toBe(true);
    });

    it('should detect invalid verdicts', () => {
      const invalidVerdict = {
        council_id: 'council1',
        run_id: 'run1',
        votes: [
          { member_id: 'A', vote: VoteVerdict.BLOCK, rationale: 'No' },
        ],
        verdict: VoteVerdict.PERMIT, // Wrong! Block present but permit returned
        timestamp: new Date().toISOString(),
      };

      const validation = CouncilVoting.validateVerdict(invalidVerdict);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Decision 2: Policy Rail Precedence (Most Restrictive Wins)', () => {
    it('should register and retrieve rails', () => {
      const rails = new PolicyRails();
      const testRail = {
        rail_id: 'test-rail',
        category: RailCategory.HARD_SAFETY,
        name: 'Test Rail',
        description: 'A test rail',
        severity: 'critical' as const,
        constraint: () => true,
      };

      rails.registerRail(testRail);
      expect(rails.getRail('test-rail')).toEqual(testRail);
    });

    it('should enforce hard safety rail precedence over domain rail', () => {
      const rails = new PolicyRails();

      // Register hard safety rail
      rails.registerRail({
        rail_id: 'hs-no-writes',
        category: RailCategory.HARD_SAFETY,
        name: 'No External Writes',
        description: 'Blocks external writes',
        severity: 'critical',
        constraint: () => false, // Violates!
      });

      // Register domain rail (would permit)
      rails.registerRail({
        rail_id: 'domain-allow-writes',
        category: RailCategory.DOMAIN,
        name: 'Allow Writes',
        description: 'Allows writes in this domain',
        domain: 'test-domain',
        severity: 'info',
        constraint: () => true,
      });

      const context: PolicyContext = {
        global_rails: ['hs-no-writes'],
        domain_rails: ['domain-allow-writes'],
        phase_rails: [],
        domain: 'test-domain',
      };

      const result = rails.applyPrecedence(context);
      expect(result.allowed).toBe(false);
      expect(result.violated_rails).toContainEqual(
        expect.objectContaining({ rail_id: 'hs-no-writes' }),
      );
    });

    it('should resolve rail conflicts to most restrictive', () => {
      const rails = new PolicyRails();

      const hardSafetyRail = {
        rail_id: 'hs-rail',
        category: RailCategory.HARD_SAFETY,
        name: 'Hard Safety',
        description: 'Most restrictive',
        severity: 'critical' as const,
        constraint: () => true,
      };

      const softRail = {
        rail_id: 'soft-rail',
        category: RailCategory.SOFT,
        name: 'Soft Guidance',
        description: 'Least restrictive',
        severity: 'info' as const,
        constraint: () => true,
      };

      rails.registerRail(hardSafetyRail);
      rails.registerRail(softRail);

      const context: PolicyContext = {
        global_rails: [],
        domain_rails: [],
        phase_rails: [],
      };

      const conflict = rails.resolveConflict(softRail, hardSafetyRail, context);
      expect(conflict.resolved_to.rail_id).toBe('hs-rail');
    });

    it('should allow actions that pass all active rails', () => {
      const rails = new PolicyRails();

      rails.registerRail({
        rail_id: 'passing-rail',
        category: RailCategory.HARD_SAFETY,
        name: 'Passing Rail',
        description: 'This passes',
        severity: 'critical',
        constraint: () => true, // Passes
      });

      const context: PolicyContext = {
        global_rails: ['passing-rail'],
        domain_rails: [],
        phase_rails: [],
      };

      const result = rails.applyPrecedence(context);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Decision 3: Decay / Pruning Logic (Hybrid Heuristic + Override)', () => {
    it('should identify age-based decay candidates', () => {
      const decay = new DecayLogic({ age_threshold_days: 30 });

      const now = new Date();
      const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

      const packets = [
        {
          packet_id: 'old-packet',
          created_at: thirtyOneDaysAgo.toISOString(),
          usage_count: 5,
          confidence: 0.8,
        },
      ];

      const candidates = decay.scanForDecayCandidates(packets);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].triggers).toContain(DecayTrigger.AGE);
    });

    it('should identify low-usage decay candidates', () => {
      const decay = new DecayLogic({ usage_threshold_runs: 10 });

      const packets = [
        {
          packet_id: 'unused-packet',
          created_at: new Date().toISOString(),
          usage_count: 2, // Below threshold
          confidence: 0.8,
        },
      ];

      const candidates = decay.scanForDecayCandidates(packets);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].triggers).toContain(DecayTrigger.LOW_USAGE);
    });

    it('should identify quality-based decay candidates', () => {
      const decay = new DecayLogic({ quality_threshold: 0.6 });

      const packets = [
        {
          packet_id: 'low-confidence-packet',
          created_at: new Date().toISOString(),
          usage_count: 20,
          confidence: 0.5, // Below threshold
        },
      ];

      const candidates = decay.scanForDecayCandidates(packets);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].triggers).toContain(DecayTrigger.LOW_QUALITY);
    });

    it('should apply decay when conditions met', () => {
      const decay = new DecayLogic({ auto_decay_enabled: true });

      const result = decay.applyDecay('packet1', [
        'Age > 30 days',
        'Low confidence',
      ]);

      expect(result.success).toBe(true);
    });

    it('should pin packets to prevent decay', () => {
      const decay = new DecayLogic();

      const override = decay.pinPacket(
        'important-packet',
        'Historical significance',
        'operator1',
      );

      expect(override.override_type).toBe('packet');
      expect(override.reason).toContain('Pin');
    });

    it('should restore decayed packets', () => {
      const decay = new DecayLogic();

      const restore = decay.restorePacket('old-packet', 'Needed for new analysis', 'operator1');

      expect(restore.override_type).toBe('packet');
      expect(restore.reason).toContain('Restore');
    });

    it('should respect operator overrides blocking decay', () => {
      const decay = new DecayLogic({ auto_decay_enabled: true });

      decay.pinPacket('protected-packet', 'Do not decay', 'operator1');

      const result = decay.applyDecay('protected-packet', ['Age > 30 days']);
      expect(result.success).toBe(false);
    });

    it('should adjust decay thresholds', () => {
      const decay = new DecayLogic({ age_threshold_days: 30 });

      let config = decay.getConfig();
      expect(config.age_threshold_days).toBe(30);

      decay.adjustThreshold('age_threshold_days', 60);

      config = decay.getConfig();
      expect(config.age_threshold_days).toBe(60);
    });
  });

  describe('Integration: All Three Decisions Together', () => {
    it('should enforce hard safety rails via council voting', () => {
      const rails = new PolicyRails();
      const council = CouncilVoting;

      // Register hard safety rail
      rails.registerRail({
        rail_id: 'hs-destructive',
        category: RailCategory.HARD_SAFETY,
        name: 'Destructive Safety',
        description: 'No destructive without approval',
        severity: 'critical',
        constraint: (ctx) =>
          ctx.metadata?.is_destructive !== true ||
          ctx.metadata?.approved === true,
      });

      // Evaluate policy
      const context: PolicyContext = {
        global_rails: ['hs-destructive'],
        domain_rails: [],
        phase_rails: [],
        metadata: { is_destructive: true, approved: false },
      };

      const policyResult = rails.applyPrecedence(context);
      expect(policyResult.allowed).toBe(false);

      // Council votes (respecting the policy violation)
      const votes: CouncilVote[] = [
        {
          member_id: 'A',
          vote: VoteVerdict.BLOCK,
          rationale: 'Violates hard safety rail',
        },
        { member_id: 'B', vote: VoteVerdict.BLOCK, rationale: 'Too risky' },
      ];

      const verdict = council.computeVerdict('council1', 'run1', votes);
      expect(verdict.verdict).toBe(VoteVerdict.BLOCK);
    });

    it('should track decayed packets for evolution', () => {
      const decay = new DecayLogic({ age_threshold_days: 7 });

      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      const packets = [
        {
          packet_id: 'research-from-week-ago',
          created_at: eightDaysAgo.toISOString(),
          usage_count: 1,
          confidence: 0.7,
        },
      ];

      const candidates = decay.scanForDecayCandidates(packets);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].suggested_action).toBe('review');
    });
  });
});
