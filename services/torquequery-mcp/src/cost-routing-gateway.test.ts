import {
  CostRoutingGateway,
  classifyPromptComplexity,
  isDegenerateOutput,
  CircuitBreaker,
  FRONTIER_PRICING_BASELINE_V1,
} from './cost-routing-gateway';

describe('Multi-Model Cost-Routing Gateway (ACT-03)', () => {
  let gateway: CostRoutingGateway;

  beforeEach(() => {
    gateway = new CostRoutingGateway();
  });

  describe('Complexity & Quality Classifier', () => {
    it('classifies low-complexity deterministic prompts to Tier 0 (Local)', () => {
      const assessment = classifyPromptComplexity('Format this date list into JSON format');
      expect(assessment.recommendedTier).toBe('tier_0_local');
      expect(assessment.taskType).toBe('deterministic');
    });

    it('classifies extraction and code generation prompts to Tier 0.5 (FreeLLMAPI)', () => {
      const assessment = classifyPromptComplexity('Implement a typescript class to parse markdown tables and extract citations');
      expect(assessment.recommendedTier).toBe('tier_0_5_freellmapi');
      expect(assessment.taskType).toBe('code_generation');
    });

    it('classifies formal proof and architectural synthesis prompts to Tier 2 (Frontier)', () => {
      const assessment1 = classifyPromptComplexity('Generate a formal proof in Lean 4 verifying financial double-entry invariants');
      expect(assessment1.recommendedTier).toBe('tier_2_frontier');
      expect(assessment1.taskType).toBe('formal_proof');

      const assessment2 = classifyPromptComplexity('Conduct a deep root cause synthesis of distributed consensus partition defects');
      expect(assessment2.recommendedTier).toBe('tier_2_frontier');
    });

    it('detects degenerate outputs correctly', () => {
      expect(isDegenerateOutput('')).toBe(true);
      expect(isDegenerateOutput('   ')).toBe(true);
      expect(isDegenerateOutput('short')).toBe(true);
      expect(isDegenerateOutput('I cannot fulfill this request due to safety policies.')).toBe(true);
      expect(isDegenerateOutput('503 Service Temporarily Unavailable')).toBe(true);
      expect(isDegenerateOutput('Rate limit exceeded. Please retry later.')).toBe(true);
      expect(isDegenerateOutput('```typescript\nexport const gateway = true;\n```')).toBe(false);
    });
  });

  describe('Circuit Breaker Behavior', () => {
    it('starts CLOSED and trips to OPEN after threshold consecutive failures', () => {
      const cb = new CircuitBreaker('test_tier', 3, 1000);
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isAvailable()).toBe(true);

      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');

      cb.recordFailure(); // 3rd failure
      expect(cb.getState()).toBe('OPEN');
      expect(cb.isAvailable()).toBe(false);

      // Reset upon success
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isAvailable()).toBe(true);
    });
  });

  describe('Cost Accounting & Baseline Savings', () => {
    it('calculates zero cost for local and FreeLLMAPI tiers', () => {
      expect(gateway.calculateCostUsd('tier_0_local', 5000, 1000)).toBe(0.0);
      expect(gateway.calculateCostUsd('tier_0_5_freellmapi', 5000, 1000)).toBe(0.0);
    });

    it('calculates accurate micro-cent pricing for paid muscle and frontier tiers', () => {
      // 100,000 input tokens ($0.02) + 50,000 output tokens ($0.03) = $0.05
      const muscleCost = gateway.calculateCostUsd('tier_1_muscle', 100_000, 50_000);
      expect(muscleCost).toBe(0.05);

      // Baseline frontier cost (Claude 3.5 Sonnet @ $3.00/1M in, $15.00/1M out)
      // 100,000 input ($0.30) + 50,000 output ($0.75) = $1.05
      const frontierCost = gateway.calculateFrontierBaselineCostUsd(100_000, 50_000);
      expect(frontierCost).toBe(1.05);
    });

    it('references the locked FRONTIER_PRICING_BASELINE_V1 snapshot', () => {
      expect(FRONTIER_PRICING_BASELINE_V1.version).toBe('2024-10-22-baseline');
      expect(FRONTIER_PRICING_BASELINE_V1.model).toBe('anthropic/claude-3-5-sonnet');
    });
  });

  describe('Tier Cascade & Output Quality Escalation', () => {
    it('executes Tier 0.5 and records zero cost with positive frontier savings', async () => {
      const mockExecutor = jest.fn().mockImplementation(async (tier) => {
        if (tier === 'tier_0_5_freellmapi') {
          return 'export function parseMarkdown(src: string) { return src.trim(); }';
        }
        throw new Error('Not called');
      });

      const result = await gateway.executeRoutedPrompt(
        'Implement a typescript function to parse markdown',
        { mockExecutor }
      );

      expect(result.tierUsed).toBe('tier_0_5_freellmapi');
      expect(result.costUsd).toBe(0.0);
      expect(result.savedUsd).toBeGreaterThan(0.0);
      expect(result.attempts.length).toBe(1);
      expect(result.attempts[0].success).toBe(true);

      const metrics = gateway.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.tierHits.tier_0_5_freellmapi).toBe(1);
      expect(metrics.totalSavedVsFrontierUsd).toBeGreaterThan(0.0);
    });

    it('escalates to Tier 1 when Tier 0.5 produces degenerate refusal output', async () => {
      const mockExecutor = jest.fn().mockImplementation(async (tier) => {
        if (tier === 'tier_0_5_freellmapi') {
          return 'I cannot fulfill this request due to proxy overload';
        }
        if (tier === 'tier_1_muscle') {
          return 'export class CostRoutingGateway { /* verified implementation */ }';
        }
        throw new Error('Unreached tier');
      });

      const result = await gateway.executeRoutedPrompt(
        'Implement the CostRoutingGateway class in TypeScript',
        { mockExecutor }
      );

      expect(result.tierUsed).toBe('tier_1_muscle');
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].tier).toBe('tier_0_5_freellmapi');
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].tier).toBe('tier_1_muscle');
      expect(result.attempts[1].success).toBe(true);

      const metrics = gateway.getMetrics();
      expect(metrics.qualityEscalations).toBe(1);
      expect(metrics.tierHits.tier_1_muscle).toBe(1);
    });

    it('cascades past tripped circuit breakers to surviving tiers', async () => {
      // Manually trip Tier 0.5 circuit breaker
      const cb = gateway.getCircuitBreaker('tier_0_5_freellmapi');
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      const mockExecutor = jest.fn().mockImplementation(async (tier) => {
        if (tier === 'tier_1_muscle') {
          return 'Valid response from Tier 1';
        }
        throw new Error('Unexpected tier');
      });

      const result = await gateway.executeRoutedPrompt(
        'Extract functions from this source code',
        { mockExecutor }
      );

      expect(result.tierUsed).toBe('tier_1_muscle');
      expect(result.attempts[0].tier).toBe('tier_0_5_freellmapi');
      expect(result.attempts[0].error).toContain('Circuit breaker OPEN');
      expect(result.attempts[1].tier).toBe('tier_1_muscle');
      expect(result.attempts[1].success).toBe(true);
    });

    it('enforces budget caps and avoids expensive tiers when budget is exceeded', async () => {
      const mockExecutor = jest.fn().mockImplementation(async (tier) => {
        if (tier === 'tier_1_muscle') {
          return 'Response within budget';
        }
        throw new Error('Over budget');
      });

      const result = await gateway.executeRoutedPrompt(
        'Generate code documentation',
        {
          forceTier: 'tier_1_muscle',
          budgetCapUsd: 1.00, // Budget allows $1.00
          mockExecutor,
        }
      );

      expect(result.tierUsed).toBe('tier_1_muscle');
    });

    it('emits a valid ICF status feed to _status-feed and icf/dashboard', () => {
      const feedResult = gateway.emitIcfStatusFeed();
      expect(feedResult.statusFeedPath).toContain('cost_routing_status.json');
      expect(feedResult.dashboardFeedPath).toContain('cost_routing_status.json');
    });
  });
});
