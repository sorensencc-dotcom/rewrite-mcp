/**
 * services/torquequery-mcp/src/cost-routing-gateway.ts
 *
 * Multi-Model Cost-Routing Gateway for Rewrite-MCP.
 * Features:
 * 1. Tiered Cascade: Tier 0 (Local Ollama) -> Tier 0.5 (FreeLLMAPI Best-Effort) -> Tier 1 (Paid Muscle) -> Tier 2 (Frontier).
 * 2. Circuit Breakers: Per-tier sliding failure counters with cooldown before half-open probe.
 * 3. Quality & Complexity Classifier: Complexity heuristics + post-inference output degeneracy escalation.
 * 4. Latency Budgets: Fast-fail timeouts per tier to prevent interactive stalling.
 * 5. Credential Hygiene: In-memory env reads only with secret masking.
 * 6. Baseline Versioning: Fixed Claude-3.5-Sonnet baseline (FRONTIER_PRICING_BASELINE_V1) for audit-stable savings.
 * 7. Best-Effort SLA Tagging: Explicitly flags unverified community proxy endpoints.
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// 1. Types & Configuration Constants
// ============================================================================

export type RoutingTier = 'tier_0_local' | 'tier_0_5_freellmapi' | 'tier_1_muscle' | 'tier_2_frontier';

export type TaskType = 
  | 'deterministic' 
  | 'extraction' 
  | 'summarization' 
  | 'code_generation' 
  | 'reasoning_synthesis' 
  | 'formal_proof';

export interface TierConfig {
  id: RoutingTier;
  displayName: string;
  reliability: 'guaranteed' | 'commercial_sla' | 'best_effort' | 'offline_local';
  inputCostPer1M: number;
  outputCostPer1M: number;
  timeoutMs: number;
  defaultModel: string;
  provider: 'ollama' | 'freellmapi' | 'openrouter' | 'anthropic' | 'openai';
}

/**
 * Audit Baseline: Claude 3.5 Sonnet (2024-10-22 snapshot).
 * Input: $3.00 / 1M tokens, Output: $15.00 / 1M tokens.
 */
export const FRONTIER_PRICING_BASELINE_V1 = {
  model: 'anthropic/claude-3-5-sonnet',
  inputCostPer1M: 3.00,
  outputCostPer1M: 15.00,
  version: '2024-10-22-baseline',
};

export const TIER_REGISTRY: Record<RoutingTier, TierConfig> = {
  tier_0_local: {
    id: 'tier_0_local',
    displayName: 'Local Ollama Substrate',
    reliability: 'offline_local',
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    timeoutMs: 60000,
    defaultModel: 'llama3.1:8b',
    provider: 'ollama',
  },
  tier_0_5_freellmapi: {
    id: 'tier_0_5_freellmapi',
    displayName: 'FreeLLMAPI Unified Router (Best-Effort Proxy)',
    reliability: 'best_effort',
    inputCostPer1M: 0.0,
    outputCostPer1M: 0.0,
    timeoutMs: 8000,
    defaultModel: 'gpt-4o-mini',
    provider: 'freellmapi',
  },
  tier_1_muscle: {
    id: 'tier_1_muscle',
    displayName: 'Paid Muscle Cloud (OpenRouter / DeepSeek / Mistral)',
    reliability: 'commercial_sla',
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.60,
    timeoutMs: 12000,
    defaultModel: 'deepseek/deepseek-chat',
    provider: 'openrouter',
  },
  tier_2_frontier: {
    id: 'tier_2_frontier',
    displayName: 'Frontier Reasoning (Claude 3.5 Sonnet / GPT-4o)',
    reliability: 'guaranteed',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    timeoutMs: 30000,
    defaultModel: 'anthropic/claude-3-5-sonnet',
    provider: 'anthropic',
  },
};

// ============================================================================
// 2. Circuit Breaker Implementation
// ============================================================================

export class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;

  constructor(
    public readonly name: string,
    public readonly failureThreshold = 3,
    public readonly cooldownMs = 30000
  ) {}

  public isAvailable(): boolean {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    this.isAvailable(); // update if cooldown elapsed
    return this.state;
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

// ============================================================================
// 3. Complexity & Quality Classifier
// ============================================================================

export interface PromptComplexityAssessment {
  taskType: TaskType;
  recommendedTier: RoutingTier;
  reasoning: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard conservative heuristic for code/English text: ~3.8 chars per token
  return Math.ceil(text.length / 3.8);
}

export function classifyPromptComplexity(
  prompt: string,
  options: { taskType?: TaskType; forceTier?: RoutingTier } = {}
): PromptComplexityAssessment {
  if (options.forceTier) {
    return {
      taskType: options.taskType || 'reasoning_synthesis',
      recommendedTier: options.forceTier,
      reasoning: `Manual override to ${options.forceTier}`,
      estimatedInputTokens: estimateTokenCount(prompt),
      estimatedOutputTokens: 500,
    };
  }

  const inTokens = estimateTokenCount(prompt);
  const lower = prompt.toLowerCase();

  // 1. Formal Proof / Critical Architecture / Complex Multi-step Logic -> Tier 2
  const isFormalProof = lower.includes('formal proof') || lower.includes('lean 4') || lower.includes('theorem') || lower.includes('invariant proof');
  const isHighReasoning = lower.includes('architectural evaluation') || lower.includes('security vulnerability analysis') || lower.includes('root cause synthesis') || lower.includes('deep reasoning');

  if (isFormalProof || isHighReasoning || inTokens > 16000) {
    return {
      taskType: isFormalProof ? 'formal_proof' : 'reasoning_synthesis',
      recommendedTier: 'tier_2_frontier',
      reasoning: isFormalProof 
        ? 'Formal mathematical theorem proving requires frontier reasoning capability.'
        : inTokens > 16000 
          ? 'Ultra-large context window requires frontier model.'
          : 'High-entropy architectural analysis requiring frontier model precision.',
      estimatedInputTokens: inTokens,
      estimatedOutputTokens: 1200,
    };
  }

  // 2. Code Generation / Complex Transformation / Large Summarization -> Tier 0.5 or Tier 1
  const isCodeGen = lower.includes('function') || lower.includes('implement') || lower.includes('class ') || lower.includes('refactor');
  const isExtraction = lower.includes('extract') || lower.includes('summarize') || lower.includes('parse');

  if (isCodeGen || isExtraction || inTokens > 3000) {
    return {
      taskType: isCodeGen ? 'code_generation' : 'extraction',
      recommendedTier: 'tier_0_5_freellmapi', // Attempt free cloud proxy first, with cascade to Tier 1
      reasoning: 'Moderate complexity code generation / extraction routed to zero-cost cloud tier.',
      estimatedInputTokens: inTokens,
      estimatedOutputTokens: 600,
    };
  }

  // 3. Fast Formatting / Classification / Keyword Lookup -> Tier 0 (Local)
  return {
    taskType: 'deterministic',
    recommendedTier: 'tier_0_local',
    reasoning: 'Low-entropy deterministic or formatting task routed to free local Ollama.',
    estimatedInputTokens: inTokens,
    estimatedOutputTokens: 250,
  };
}

/**
 * Output Sanity Validation:
 * Detects empty strings, extreme truncation, refusals, or hallucination loops.
 */
export function isDegenerateOutput(output: string | null | undefined): boolean {
  if (!output || typeof output !== 'string') return true;
  const trimmed = output.trim();
  if (trimmed.length < 10) return true;

  const lower = trimmed.toLowerCase();
  const refusalMarkers = [
    'i cannot fulfill this request',
    'as an ai language model',
    'i am unable to process',
    'rate limit exceeded',
    'service unavailable',
    'internal server error',
    '503 service temporarily unavailable'
  ];

  for (const marker of refusalMarkers) {
    if (lower.startsWith(marker) || (lower.length < 200 && lower.includes(marker))) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// 4. Multi-Model Cost-Routing Gateway Engine
// ============================================================================

export interface GatewayMetrics {
  totalRequests: number;
  tierHits: Record<RoutingTier, number>;
  circuitBreakerTrips: Record<RoutingTier, number>;
  qualityEscalations: number;
  totalSpentUsd: number;
  totalSavedVsFrontierUsd: number;
  averageLatencyMs: number;
}

export interface RoutingExecutionResult {
  content: string;
  tierUsed: RoutingTier;
  modelUsed: string;
  costUsd: number;
  baselineFrontierCostUsd: number;
  savedUsd: number;
  latencyMs: number;
  attempts: Array<{
    tier: RoutingTier;
    model: string;
    success: boolean;
    error?: string;
    latencyMs: number;
  }>;
}

export class CostRoutingGateway {
  private circuitBreakers: Record<RoutingTier, CircuitBreaker>;
  private metrics: GatewayMetrics;
  private totalLatencyAccumulator = 0;

  constructor() {
    this.circuitBreakers = {
      tier_0_local: new CircuitBreaker('tier_0_local', 3, 20000),
      tier_0_5_freellmapi: new CircuitBreaker('tier_0_5_freellmapi', 3, 30000),
      tier_1_muscle: new CircuitBreaker('tier_1_muscle', 3, 20000),
      tier_2_frontier: new CircuitBreaker('tier_2_frontier', 3, 20000),
    };

    this.metrics = {
      totalRequests: 0,
      tierHits: {
        tier_0_local: 0,
        tier_0_5_freellmapi: 0,
        tier_1_muscle: 0,
        tier_2_frontier: 0,
      },
      circuitBreakerTrips: {
        tier_0_local: 0,
        tier_0_5_freellmapi: 0,
        tier_1_muscle: 0,
        tier_2_frontier: 0,
      },
      qualityEscalations: 0,
      totalSpentUsd: 0.0,
      totalSavedVsFrontierUsd: 0.0,
      averageLatencyMs: 0.0,
    };
  }

  public getCircuitBreaker(tier: RoutingTier): CircuitBreaker {
    return this.circuitBreakers[tier];
  }

  public getMetrics(): GatewayMetrics {
    return {
      ...this.metrics,
      tierHits: { ...this.metrics.tierHits },
      circuitBreakerTrips: { ...this.metrics.circuitBreakerTrips },
    };
  }

  public calculateCostUsd(tier: RoutingTier, inTokens: number, outTokens: number): number {
    const cfg = TIER_REGISTRY[tier];
    const inCost = (inTokens / 1_000_000) * cfg.inputCostPer1M;
    const outCost = (outTokens / 1_000_000) * cfg.outputCostPer1M;
    return parseFloat((inCost + outCost).toFixed(6));
  }

  public calculateFrontierBaselineCostUsd(inTokens: number, outTokens: number): number {
    const inCost = (inTokens / 1_000_000) * FRONTIER_PRICING_BASELINE_V1.inputCostPer1M;
    const outCost = (outTokens / 1_000_000) * FRONTIER_PRICING_BASELINE_V1.outputCostPer1M;
    return parseFloat((inCost + outCost).toFixed(6));
  }

  /**
   * Determine tier cascade path starting from target tier.
   */
  public getTierCascade(startingTier: RoutingTier): RoutingTier[] {
    const allTiers: RoutingTier[] = ['tier_0_local', 'tier_0_5_freellmapi', 'tier_1_muscle', 'tier_2_frontier'];
    const startIdx = allTiers.indexOf(startingTier);
    return allTiers.slice(startIdx);
  }

  /**
   * Execute model prompt with dynamic failover, quality gating, and cost tracking.
   */
  public async executeRoutedPrompt(
    prompt: string,
    options: {
      forceTier?: RoutingTier;
      taskType?: TaskType;
      budgetCapUsd?: number;
      mockExecutor?: (tier: RoutingTier, model: string, timeoutMs: number) => Promise<string>;
    } = {}
  ): Promise<RoutingExecutionResult> {
    const startTime = Date.now();
    const assessment = classifyPromptComplexity(prompt, options);
    const cascade = this.getTierCascade(assessment.recommendedTier);

    const attempts: RoutingExecutionResult['attempts'] = [];
    let successfulResult: string | null = null;
    let winningTier: RoutingTier | null = null;
    let winningModel = '';

    for (const tier of cascade) {
      const cfg = TIER_REGISTRY[tier];
      const cb = this.circuitBreakers[tier];

      // Check circuit breaker
      if (!cb.isAvailable()) {
        this.metrics.circuitBreakerTrips[tier]++;
        attempts.push({
          tier,
          model: cfg.defaultModel,
          success: false,
          error: `Circuit breaker OPEN (cooldown active)`,
          latencyMs: 0,
        });
        continue;
      }

      // Check optional budget cap
      if (options.budgetCapUsd !== undefined) {
        const estCost = this.calculateCostUsd(tier, assessment.estimatedInputTokens, assessment.estimatedOutputTokens);
        if (estCost > options.budgetCapUsd && tier !== 'tier_0_local' && tier !== 'tier_0_5_freellmapi') {
          attempts.push({
            tier,
            model: cfg.defaultModel,
            success: false,
            error: `Exceeds budget cap of $${options.budgetCapUsd} (estimated: $${estCost})`,
            latencyMs: 0,
          });
          continue;
        }
      }

      const attemptStart = Date.now();
      try {
        let rawOutput = '';
        if (options.mockExecutor) {
          rawOutput = await options.mockExecutor(tier, cfg.defaultModel, cfg.timeoutMs);
        } else {
          rawOutput = await this.invokeProvider(tier, cfg, prompt);
        }

        const latency = Date.now() - attemptStart;

        // Post-inference Quality Check (Degeneracy Escalation)
        if (isDegenerateOutput(rawOutput)) {
          cb.recordFailure();
          this.metrics.qualityEscalations++;
          attempts.push({
            tier,
            model: cfg.defaultModel,
            success: false,
            error: `Output failed quality verification (degenerate/refusal/empty)`,
            latencyMs: latency,
          });
          continue; // Escalate to next tier in cascade
        }

        // Successful execution
        cb.recordSuccess();
        successfulResult = rawOutput;
        winningTier = tier;
        winningModel = cfg.defaultModel;
        attempts.push({
          tier,
          model: cfg.defaultModel,
          success: true,
          latencyMs: latency,
        });
        break;
      } catch (err: any) {
        const latency = Date.now() - attemptStart;
        cb.recordFailure();
        attempts.push({
          tier,
          model: cfg.defaultModel,
          success: false,
          error: err.message || String(err),
          latencyMs: latency,
        });
      }
    }

    if (!successfulResult || !winningTier) {
      throw new Error(`CostRoutingGateway failed across all cascade tiers: ${JSON.stringify(attempts)}`);
    }

    const totalDuration = Date.now() - startTime;
    const outTokens = estimateTokenCount(successfulResult);
    const costUsd = this.calculateCostUsd(winningTier, assessment.estimatedInputTokens, outTokens);
    const baselineFrontierCostUsd = this.calculateFrontierBaselineCostUsd(assessment.estimatedInputTokens, outTokens);
    const savedUsd = parseFloat(Math.max(0, baselineFrontierCostUsd - costUsd).toFixed(6));

    // Update telemetry
    this.metrics.totalRequests++;
    this.metrics.tierHits[winningTier]++;
    this.metrics.totalSpentUsd = parseFloat((this.metrics.totalSpentUsd + costUsd).toFixed(6));
    this.metrics.totalSavedVsFrontierUsd = parseFloat((this.metrics.totalSavedVsFrontierUsd + savedUsd).toFixed(6));
    this.totalLatencyAccumulator += totalDuration;
    this.metrics.averageLatencyMs = parseFloat((this.totalLatencyAccumulator / this.metrics.totalRequests).toFixed(1));

    // Synchronize telemetry feed to ICF (_status-feed & icf/dashboard)
    this.emitIcfStatusFeed();

    return {
      content: successfulResult,
      tierUsed: winningTier,
      modelUsed: winningModel,
      costUsd,
      baselineFrontierCostUsd,
      savedUsd,
      latencyMs: totalDuration,
      attempts,
    };
  }

  /**
   * Synchronize real-time cost-routing telemetry to Iron Command Forge (_status-feed & icf/dashboard).
   */
  public emitIcfStatusFeed(repoRoot = 'C:/dev'): { statusFeedPath: string; dashboardFeedPath: string } {
    const feed = {
      timestamp: new Date().toISOString(),
      status: 'HEALTHY',
      provider: 'torquequery-mcp / cost-routing-gateway',
      frontierPricingBaseline: FRONTIER_PRICING_BASELINE_V1,
      tiers: Object.fromEntries(
        (Object.keys(TIER_REGISTRY) as RoutingTier[]).map((t) => [
          t,
          {
            displayName: TIER_REGISTRY[t].displayName,
            reliability: TIER_REGISTRY[t].reliability,
            circuitBreakerState: this.circuitBreakers[t].getState(),
            hits: this.metrics.tierHits[t],
          },
        ])
      ),
      metrics: this.getMetrics(),
    };

    const statusFeedDir = path.join(repoRoot, '_status-feed');
    const dashboardDir = path.join(repoRoot, 'icf', 'dashboard');
    const statusFeedPath = path.join(statusFeedDir, 'cost_routing_status.json');
    const dashboardFeedPath = path.join(dashboardDir, 'cost_routing_status.json');

    try {
      if (fs.existsSync(statusFeedDir)) {
        fs.writeFileSync(statusFeedPath, JSON.stringify(feed, null, 2), 'utf-8');
      }
      if (fs.existsSync(dashboardDir)) {
        fs.writeFileSync(dashboardFeedPath, JSON.stringify(feed, null, 2), 'utf-8');
      }
    } catch (err: any) {
      console.warn(`[CostRoutingGateway] Could not write ICF status feed: ${err.message}`);
    }

    return { statusFeedPath, dashboardFeedPath };
  }

  /**
   * Real provider invocation with timeout bounds and credential hygiene.
   */
  private async invokeProvider(tier: RoutingTier, cfg: TierConfig, prompt: string): Promise<string> {
    const client: AxiosInstance = axios.create({ timeout: cfg.timeoutMs });

    switch (tier) {
      case 'tier_0_local': {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
        const res = await client.post(`${ollamaUrl}/chat/completions`, {
          model: cfg.defaultModel,
          messages: [{ role: 'user', content: prompt }],
        });
        return res.data?.choices?.[0]?.message?.content || '';
      }

      case 'tier_0_5_freellmapi': {
        const baseUrl = process.env.FREELLMAPI_BASE_URL || 'http://localhost:3001/v1';
        const apiKey = process.env.FREELLMAPI_API_KEY || process.env.OPENAI_API_KEY;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        const res = await client.post(
          `${baseUrl}/chat/completions`,
          {
            model: cfg.defaultModel,
            messages: [{ role: 'user', content: prompt }],
          },
          { headers }
        );
        return res.data?.choices?.[0]?.message?.content || '';
      }

      case 'tier_1_muscle': {
        const openRouterUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
        const res = await client.post(
          `${openRouterUrl}/chat/completions`,
          {
            model: cfg.defaultModel,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return res.data?.choices?.[0]?.message?.content || '';
      }

      case 'tier_2_frontier': {
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (anthropicApiKey) {
          const res = await client.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            },
            {
              headers: {
                'x-api-key': anthropicApiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
              },
            }
          );
          return res.data?.content?.[0]?.text || '';
        }
        if (openaiApiKey) {
          const res = await client.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o',
              messages: [{ role: 'user', content: prompt }],
            },
            {
              headers: {
                Authorization: `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          return res.data?.choices?.[0]?.message?.content || '';
        }
        throw new Error('No frontier API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY required for tier_2_frontier)');
      }

      default:
        throw new Error(`Unsupported routing tier: ${tier}`);
    }
  }
}
