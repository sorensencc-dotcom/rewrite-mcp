import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUARD_STATUS,
  TRIP_REASON,
  ActiveFocusLoopGuard,
  MuseWonderEvaluationEngine,
  calculateCost
} from '../src/index.mjs';

test('Active Focus loop guardrail halts repeating 2-cycle tool calls', () => {
  const guard = new ActiveFocusLoopGuard();

  const step1 = guard.recordAction({ toolName: 'search_catalog', args: { q: 'wireless mouse' } });
  assert.equal(step1.status, GUARD_STATUS.HEALTHY);

  const step2 = guard.recordAction({ toolName: 'fetch_reviews', args: { asin: 'B001' } });
  assert.equal(step2.status, GUARD_STATUS.HEALTHY);

  const step3 = guard.recordAction({ toolName: 'search_catalog', args: { q: 'wireless mouse' } });
  assert.equal(step3.status, GUARD_STATUS.HEALTHY);

  const step4 = guard.recordAction({ toolName: 'fetch_reviews', args: { asin: 'B001' } });
  assert.equal(step4.status, GUARD_STATUS.TRIPPED);
  assert.equal(step4.reason, TRIP_REASON.CYCLE_DETECTED);
  assert.ok(step4.escalation);
  assert.equal(step4.escalation.recommendedAction, 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(step4.escalation.details.cycleLength, 2);
  assert.equal(step4.escalation.details.repetitions, 2);
});

test('Active Focus loop guardrail halts repeating 3-cycle tool calls', () => {
  const guard = new ActiveFocusLoopGuard();

  const sequence = [
    { toolName: 'query_vector_store', args: { term: 'oauth2' } },
    { toolName: 'parse_documentation', args: { docId: 'auth_v2' } },
    { toolName: 'validate_payload_schema', args: { schema: 'token_request' } }
  ];

  for (const item of sequence) {
    const res = guard.recordAction(item);
    assert.equal(res.status, GUARD_STATUS.HEALTHY);
  }

  const res4 = guard.recordAction(sequence[0]);
  assert.equal(res4.status, GUARD_STATUS.HEALTHY);

  const res5 = guard.recordAction(sequence[1]);
  assert.equal(res5.status, GUARD_STATUS.HEALTHY);

  const res6 = guard.recordAction(sequence[2]);
  assert.equal(res6.status, GUARD_STATUS.TRIPPED);
  assert.equal(res6.reason, TRIP_REASON.CYCLE_DETECTED);
  assert.ok(res6.escalation);
  assert.equal(res6.escalation.details.cycleLength, 3);
  assert.equal(res6.escalation.details.repetitions, 2);
});

test('Active Focus loop guardrail enforces hard turn ceiling and escalates to human review', () => {
  const guard = new ActiveFocusLoopGuard({ maxTurns: 5, warningTurnThreshold: 4 });

  for (let i = 1; i <= 3; i++) {
    const res = guard.recordAction({ toolName: `unique_tool_${i}`, args: { index: i } });
    assert.equal(res.status, GUARD_STATUS.HEALTHY);
  }

  const res4 = guard.recordAction({ toolName: 'unique_tool_4', args: { index: 4 } });
  assert.equal(res4.status, GUARD_STATUS.WARNING);
  assert.equal(res4.turnCount, 4);

  const res5 = guard.recordAction({ toolName: 'unique_tool_5', args: { index: 5 } });
  assert.equal(res5.status, GUARD_STATUS.TRIPPED);
  assert.equal(res5.reason, TRIP_REASON.MAX_TURNS_EXCEEDED);
  assert.ok(res5.escalation);
  assert.equal(res5.escalation.status, 'ESCALATED');
  assert.equal(res5.escalation.recommendedAction, 'HUMAN_APPROVAL_REQUIRED');
  assert.equal(res5.escalation.turnCount, 5);
});

test('Healthy non-looping workflow passes through guardrail unhindered', () => {
  const guard = new ActiveFocusLoopGuard();

  const healthySteps = [
    { toolName: 'customer_lookup', args: { id: 'cust-1' } },
    { toolName: 'invoice_list', args: { custId: 'cust-1' } },
    { toolName: 'payment_status', args: { invId: 'inv-99' } },
    { toolName: 'send_receipt_email', args: { invId: 'inv-99', email: 'cust@example.com' } }
  ];

  for (const step of healthySteps) {
    const res = guard.recordAction(step);
    assert.equal(res.status, GUARD_STATUS.HEALTHY);
    assert.equal(res.reason, null);
    assert.equal(res.escalation, null);
  }

  assert.equal(guard.getStatus(), GUARD_STATUS.HEALTHY);
  assert.equal(guard.getTurnCount(), 4);
});

test('Benchmark engine evaluates token economics and cost arbitrage across Muse Wonder, Sonnet 5.5, GPT-6.1 Sol, and Haiku 5.5', () => {
  const engine = new MuseWonderEvaluationEngine();

  const usage = {
    inputTokens: 1_000_000,
    outputTokens: 100_000,
    cacheReadTokens: 500_000,
    webSearchCount: 2000
  };

  const museCost = calculateCost('meta-muse-wonder', usage);
  const sonnetCost = calculateCost('claude-sonnet-5.5', usage);
  const solCost = calculateCost('gpt-6.1-sol', usage);
  const haikuCost = calculateCost('claude-haiku-5.5', usage);

  assert.equal(museCost, 11.1);
  assert.equal(sonnetCost, 4.5);
  assert.equal(solCost, 7.5);
  assert.equal(haikuCost, 0.14);

  const economics = engine.evaluateTokenEconomics(usage);
  assert.equal(economics.costs.museWonder, 11.1);
  assert.equal(economics.costs.sonnet55, 4.5);
  assert.equal(economics.costs.gpt61Sol, 7.5);
  assert.equal(economics.costs.haiku55, 0.14);
  assert.ok(economics.arbitrage.museWonderVsSonnet55Delta > 0);
  assert.ok(economics.arbitrage.museWonderVsGpt61SolDelta > 0);
});

test('Adversarial unconstrained wander simulation proves loop prevention (stops at turn <=15 turns vs 50+ turns)', () => {
  const engine = new MuseWonderEvaluationEngine();

  const guardedResult = engine.simulateAdversarialWander({ useGuard: true });
  assert.ok(guardedResult.turns <= 15, `Guarded wander should halt within 15 turns, took: ${guardedResult.turns}`);
  assert.equal(guardedResult.guardStatus, GUARD_STATUS.TRIPPED);
  assert.equal(guardedResult.tripReason, TRIP_REASON.CYCLE_DETECTED);
  assert.ok(guardedResult.escalation);

  const unguardedResult = engine.simulateAdversarialWander({ useGuard: false, maxUnguardedTurns: 55 });
  assert.ok(unguardedResult.turns >= 50, `Unguarded wander should exceed 50 turns, took: ${unguardedResult.turns}`);
  assert.equal(unguardedResult.guardStatus, 'UNGUARDED_RUNAWAY');
  assert.ok(unguardedResult.costs.museWonder > guardedResult.costs.museWonder * 5);
});

test('Data privacy audit checks confirm Contributor Mode bypass and zero retention', () => {
  const engine = new MuseWonderEvaluationEngine();

  const validAudit = engine.auditPrivacy({
    'X-Meta-Contributor-Mode': 'bypass',
    'X-Meta-Data-Retention': 'zero'
  });
  assert.equal(validAudit.compliant, true);
  assert.equal(validAudit.contributorModeBypassed, true);
  assert.equal(validAudit.zeroRetentionConfirmed, true);
  assert.equal(validAudit.notes.length, 0);

  const nonCompliantAudit = engine.auditPrivacy({
    contributorModeBypass: false,
    zeroDataRetention: false
  });
  assert.equal(nonCompliantAudit.compliant, false);
  assert.equal(nonCompliantAudit.contributorModeBypassed, false);
  assert.equal(nonCompliantAudit.zeroRetentionConfirmed, false);
  assert.ok(nonCompliantAudit.notes.length >= 2);
});
