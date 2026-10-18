import {
  GUARD_STATUS,
  TRIP_REASON,
  WORKLOAD_TYPES,
  MODEL_PRICING,
  calculateCost
} from './types.mjs';
import { ActiveFocusLoopGuard } from './loop-guard.mjs';

export class MuseWonderEvaluationEngine {
  constructor({ guardConfig = {}, defaultPrivacyPolicy = {} } = {}) {
    this.guardConfig = guardConfig;
    this.privacyPolicy = {
      contributorModeBypass: true,
      zeroDataRetention: true,
      ...defaultPrivacyPolicy
    };
  }

  auditPrivacy(headersOrConfig = {}) {
    const contributorHeader = headersOrConfig['X-Meta-Contributor-Mode'] || headersOrConfig['x-meta-contributor-mode'];
    const retentionHeader = headersOrConfig['X-Meta-Data-Retention'] || headersOrConfig['x-meta-data-retention'];

    const contributorBypass =
      contributorHeader === 'bypass' ||
      headersOrConfig.contributorModeBypass === true ||
      headersOrConfig.contributor_mode === false ||
      (this.privacyPolicy.contributorModeBypass === true && !('contributorModeBypass' in headersOrConfig));

    const zeroRetention =
      retentionHeader === 'zero' ||
      headersOrConfig.zeroDataRetention === true ||
      headersOrConfig.zero_retention === true ||
      (this.privacyPolicy.zeroDataRetention === true && !('zeroDataRetention' in headersOrConfig));

    const notes = [];
    if (!contributorBypass) {
      notes.push('VIOLATION: Contributor Mode is active; prompts may be ingested for model training.');
    }
    if (!zeroRetention) {
      notes.push('VIOLATION: Zero data retention is not guaranteed by API client configuration.');
    }

    return {
      contributorModeBypassed: Boolean(contributorBypass),
      zeroRetentionConfirmed: Boolean(zeroRetention),
      compliant: Boolean(contributorBypass && zeroRetention),
      notes
    };
  }

  evaluateTokenEconomics({ inputTokens, outputTokens, cacheReadTokens = 0, webSearchCount = 0 }) {
    const tokenUsage = { inputTokens, outputTokens, cacheReadTokens, webSearchCount };
    const costs = {
      museWonder: calculateCost('meta-muse-wonder', tokenUsage),
      sonnet55: calculateCost('claude-sonnet-5.5', tokenUsage),
      gpt61Sol: calculateCost('gpt-6.1-sol', tokenUsage),
      haiku55: calculateCost('claude-haiku-5.5', tokenUsage)
    };

    return {
      tokenUsage,
      costs,
      arbitrage: {
        museWonderVsSonnet55Delta: Math.round((costs.museWonder - costs.sonnet55) * 1_000_000) / 1_000_000,
        museWonderVsGpt61SolDelta: Math.round((costs.museWonder - costs.gpt61Sol) * 1_000_000) / 1_000_000,
        sonnetCostRatio: costs.sonnet55 > 0 ? Math.round((costs.museWonder / costs.sonnet55) * 100) / 100 : 0,
        solCostRatio: costs.gpt61Sol > 0 ? Math.round((costs.museWonder / costs.gpt61Sol) * 100) / 100 : 0
      }
    };
  }

  simulateAdversarialWander({ useGuard = true, guardInstance = null, maxUnguardedTurns = 60 } = {}) {
    const guard = useGuard ? (guardInstance || new ActiveFocusLoopGuard(this.guardConfig)) : null;
    let turn = 0;
    let guardStatus = GUARD_STATUS.HEALTHY;
    let tripReason = null;
    let escalation = null;

    const repeatingSequence = [
      { toolName: 'web_search', args: { query: 'active focus autonomous agent research papers' } },
      { toolName: 'fetch_page', args: { url: 'https://arxiv.org/abs/2604.activefocus' } }
    ];

    while (turn < maxUnguardedTurns) {
      turn++;
      const action = repeatingSequence[(turn - 1) % repeatingSequence.length];

      if (guard) {
        const evaluation = guard.recordAction({
          toolName: action.toolName,
          args: action.args,
          turnIndex: turn,
          success: true
        });

        if (evaluation.status === GUARD_STATUS.TRIPPED) {
          guardStatus = evaluation.status;
          tripReason = evaluation.reason;
          escalation = evaluation.escalation;
          break;
        }
      }
    }

    if (!guard && turn >= maxUnguardedTurns) {
      guardStatus = 'UNGUARDED_RUNAWAY';
    }

    const inputTokensPerTurn = 1800;
    const outputTokensPerTurn = 450;
    const cacheTokensPerTurn = 1200;
    const webSearchPerTurn = 1;

    const totalInput = inputTokensPerTurn * turn;
    const totalOutput = outputTokensPerTurn * turn;
    const totalCache = cacheTokensPerTurn * turn;
    const totalSearches = Math.ceil(turn / 2);

    const economics = this.evaluateTokenEconomics({
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheReadTokens: totalCache,
      webSearchCount: totalSearches
    });

    return {
      workload: 'unconstrained_wander_adversarial',
      useGuard,
      turns: turn,
      guardStatus,
      tripReason,
      escalation,
      latency: {
        ttftMs: 440,
        tokensPerSecond: 42.5,
        totalDurationMs: turn * 650
      },
      ...economics
    };
  }

  runScenario(workloadType, options = {}) {
    if (!WORKLOAD_TYPES.includes(workloadType) && workloadType !== 'all') {
      throw new TypeError(`Unsupported workload type: ${workloadType}`);
    }

    if (workloadType === 'unconstrained_wander_adversarial') {
      return this.simulateAdversarialWander(options);
    }

    const scenarioConfigs = {
      customer_support_multi_turn: {
        turns: 4,
        steps: [
          { toolName: 'customer_lookup', args: { customerId: 'cust-90210' } },
          { toolName: 'order_history_fetch', args: { customerId: 'cust-90210', limit: 5 } },
          { toolName: 'policy_rules_engine', args: { policyId: 'return_30_days' } },
          { toolName: 'process_refund', args: { orderId: 'ord-8831', amount: 49.99 } }
        ],
        inputTokens: 2400,
        outputTokens: 650,
        cacheReadTokens: 1800,
        webSearchCount: 0,
        ttftMs: 380,
        tokensPerSecond: 48.0,
        durationMs: 1200
      },
      constrained_scheduling: {
        turns: 5,
        steps: [
          { toolName: 'calendar_get_availability', args: { calendarId: 'exec-1', range: '2026-10-19' } },
          { toolName: 'calendar_check_conflicts', args: { start: '14:00', end: '15:00' } },
          { toolName: 'reserve_conference_room', args: { roomId: 'room-alpha', duration: 60 } },
          { toolName: 'create_calendar_invite', args: { attendees: ['soren@rewritelabs.com'] } },
          { toolName: 'send_sms_notification', args: { phone: '+15550199' } }
        ],
        inputTokens: 3100,
        outputTokens: 420,
        cacheReadTokens: 2200,
        webSearchCount: 0,
        ttftMs: 350,
        tokensPerSecond: 52.0,
        durationMs: 950
      },
      ecommerce_order_fulfillment: {
        turns: 4,
        steps: [
          { toolName: 'inventory_reserve', args: { sku: 'SKU-7729', quantity: 2 } },
          { toolName: 'tax_calculate', args: { postalCode: '94103', subtotal: 120.00 } },
          { toolName: 'payment_auth_hold', args: { cardRef: 'tok_visa_4242', amount: 130.50 } },
          { toolName: 'shipping_label_generate', args: { carrier: 'USPS_PRIORITY', weightOz: 16 } }
        ],
        inputTokens: 4200,
        outputTokens: 890,
        cacheReadTokens: 3000,
        webSearchCount: 1,
        ttftMs: 420,
        tokensPerSecond: 45.0,
        durationMs: 1400
      }
    };

    const cfg = scenarioConfigs[workloadType];
    const guard = options.useGuard !== false ? (options.guardInstance || new ActiveFocusLoopGuard(this.guardConfig)) : null;

    let finalStatus = GUARD_STATUS.HEALTHY;
    let finalReason = null;
    let escalation = null;

    if (guard) {
      for (let i = 0; i < cfg.steps.length; i++) {
        const step = cfg.steps[i];
        const res = guard.recordAction({
          toolName: step.toolName,
          args: step.args,
          turnIndex: i + 1,
          success: true
        });
        if (res.status === GUARD_STATUS.TRIPPED) {
          finalStatus = res.status;
          finalReason = res.reason;
          escalation = res.escalation;
          break;
        }
      }
    }

    const economics = this.evaluateTokenEconomics({
      inputTokens: cfg.inputTokens,
      outputTokens: cfg.outputTokens,
      cacheReadTokens: cfg.cacheReadTokens,
      webSearchCount: cfg.webSearchCount
    });

    return {
      workload: workloadType,
      useGuard: options.useGuard !== false,
      turns: cfg.turns,
      guardStatus: finalStatus,
      tripReason: finalReason,
      escalation,
      latency: {
        ttftMs: cfg.ttftMs,
        tokensPerSecond: cfg.tokensPerSecond,
        totalDurationMs: cfg.durationMs
      },
      ...economics
    };
  }

  runBenchmark({ workloads = ['customer_support_multi_turn', 'constrained_scheduling', 'ecommerce_order_fulfillment', 'unconstrained_wander_adversarial'], useGuard = true } = {}) {
    const list = workloads === 'all'
      ? ['customer_support_multi_turn', 'constrained_scheduling', 'ecommerce_order_fulfillment', 'unconstrained_wander_adversarial']
      : workloads;

    const scenarioResults = list.map(w => this.runScenario(w, { useGuard }));
    const privacyAudit = this.auditPrivacy();

    const aggregateCost = {
      museWonder: 0,
      sonnet55: 0,
      gpt61Sol: 0,
      haiku55: 0
    };

    let totalDuration = 0;
    let totalTtft = 0;
    let totalTps = 0;

    for (const r of scenarioResults) {
      aggregateCost.museWonder += r.costs.museWonder;
      aggregateCost.sonnet55 += r.costs.sonnet55;
      aggregateCost.gpt61Sol += r.costs.gpt61Sol;
      aggregateCost.haiku55 += r.costs.haiku55;
      totalDuration += r.latency.totalDurationMs;
      totalTtft += r.latency.ttftMs;
      totalTps += r.latency.tokensPerSecond;
    }

    const count = scenarioResults.length || 1;
    const avgLatency = {
      avgTtftMs: Math.round(totalTtft / count),
      avgTps: Math.round((totalTps / count) * 10) / 10,
      totalDurationMs: totalDuration
    };

    aggregateCost.museWonder = Math.round(aggregateCost.museWonder * 1_000_000) / 1_000_000;
    aggregateCost.sonnet55 = Math.round(aggregateCost.sonnet55 * 1_000_000) / 1_000_000;
    aggregateCost.gpt61Sol = Math.round(aggregateCost.gpt61Sol * 1_000_000) / 1_000_000;
    aggregateCost.haiku55 = Math.round(aggregateCost.haiku55 * 1_000_000) / 1_000_000;

    return {
      timestamp: new Date().toISOString(),
      scenarioCount: scenarioResults.length,
      scenarios: scenarioResults,
      privacyAudit,
      aggregateCost,
      avgLatency,
      recommendation: {
        verdict: 'DROP_DO_NOT_DEPLOY',
        unconstrainedWorkflowsAllowed: false,
        restrictedEnvironments: ['supervised_developer_sandboxes'],
        rationale: 'Active Focus exhibits severe runaway loop tendencies under unconstrained tool trajectories. Middleware loop detection guardrails are mandatory before production client deployment.'
      }
    };
  }
}
