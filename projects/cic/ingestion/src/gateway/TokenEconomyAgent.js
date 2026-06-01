/**
 * TokenEconomyAgent.js
 * @version 0.1.0
 * @date 2026-05-31
 *
 * Gateway enforcement agent for token economy constraints.
 * Validates all LLM requests against budget, enforces max bounds, tracks costs.
 *
 * Responsibilities:
 *   1. Pre-flight validation (budget, model, timeout)
 *   2. Request queuing and priority scheduling
 *   3. Rate limiting and cost tracking
 *   4. Budget exhaustion detection and soft-fail
 *   5. Telemetry emission for cost analytics
 *
 * Configuration:
 *   - max_per_request_tokens: hard limit per individual request
 *   - max_prompt_tokens: hard limit for prompt length
 *   - max_completion_tokens: hard limit for completion output
 *   - max_timeout_ms: hard limit for request timeout
 *   - token_budget_daily: daily spend budget in tokens
 *   - hard_stop_at: percentage of budget (e.g., 0.95 = stop at 95%)
 */

import { LLMRequest } from './LLMRequest.js';

const MODULE = 'TokenEconomyAgent';

export class TokenEconomyAgent {
  constructor(config = {}) {
    // Gateway limits (hard constraints)
    this.max_per_request_tokens = config.max_per_request_tokens ?? 8000;
    this.max_prompt_tokens = config.max_prompt_tokens ?? 32000;
    this.max_completion_tokens = config.max_completion_tokens ?? 4096;
    this.max_timeout_ms = config.max_timeout_ms ?? 120000;

    // Daily budget tracking
    this.token_budget_daily = config.token_budget_daily ?? 1000000;
    this.hard_stop_at = config.hard_stop_at ?? 0.95;

    // Runtime state
    this.requests = new Map(); // correlation_id -> LLMRequest
    this.daily_tokens_used = 0;
    this.daily_reset_at = this._nextDailyReset();
    this.budget_exhausted = false;

    // Metrics
    this.metrics = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      budget_exceeded_count: 0,
      total_tokens_used: 0,
      avg_completion_tokens: 0,
    };
  }

  /**
   * Pre-flight validation for an LLM request
   * Returns: { valid: boolean, errors: string[] }
   */
  validateRequest(req) {
    const errors = [];

    // Type check
    if (!(req instanceof LLMRequest)) {
      errors.push('request must be an LLMRequest instance');
      return { valid: false, errors };
    }

    // Model check
    if (!this._isModelAllowed(req.model)) {
      errors.push(`model '${req.model}' is not allowed`);
    }

    // Budget check (hard limit)
    if (req.budget_tokens > this.max_per_request_tokens) {
      errors.push(
        `budget_tokens (${req.budget_tokens}) exceeds gateway limit (${this.max_per_request_tokens})`
      );
    }

    // Prompt length check
    if (req.tokens_estimated > this.max_prompt_tokens) {
      errors.push(
        `estimated prompt (${req.tokens_estimated}) exceeds limit (${this.max_prompt_tokens})`
      );
    }

    // Timeout check
    if (req.timeout_ms > this.max_timeout_ms) {
      errors.push(
        `timeout_ms (${req.timeout_ms}) exceeds limit (${this.max_timeout_ms})`
      );
    }

    // Daily budget check (soft warning, but still allow)
    if (this._dailyBudgetExhausted()) {
      errors.push(
        `daily budget exhausted (${this.daily_tokens_used}/${this.token_budget_daily} tokens used)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute request through token economy gate
   * This is called by the gateway before delegating to actual model client
   */
  async executeRequest(req, modelClient) {
    // Validate request
    const validation = this.validateRequest(req);
    if (!validation.valid) {
      const err = new Error(`[${MODULE}] request validation failed: ${validation.errors.join('; ')}`);
      req.markFailed(err);
      this.metrics.failed_requests++;
      throw err;
    }

    // Register request
    this.requests.set(req.correlation_id, req);
    this.metrics.total_requests++;

    // Mark as started
    req.markStarted();

    try {
      // Call actual model client
      const result = await modelClient.complete({
        model: req.model,
        prompt: req.prompt,
        max_tokens: req.max_tokens,
        correlation_id: req.correlation_id,
      });

      // Extract token counts
      const tokens_prompt = result.tokens_prompt ?? 0;
      const tokens_completion = result.tokens_completion ?? 0;

      // Check for budget overage
      if (tokens_completion > req.budget_tokens) {
        const msg = `completion tokens (${tokens_completion}) exceeded budget (${req.budget_tokens})`;
        console.warn(`[${MODULE}] ${msg}`);
      }

      // Record actual token usage
      req.markCompleted(tokens_prompt, tokens_completion);
      this._trackTokenUsage(tokens_prompt, tokens_completion);

      // Update metrics
      this.metrics.successful_requests++;
      this.metrics.total_tokens_used += tokens_completion;

      // Emit telemetry
      this._emitTelemetry(req);

      // Reset daily budget if needed
      if (new Date() > new Date(this.daily_reset_at)) {
        this._resetDailyBudget();
      }

      return {
        completion: result.text || result.content || '',
        tokens_prompt,
        tokens_completion,
        cost: this._calculateCost(req.model, tokens_completion),
      };
    } catch (err) {
      req.markFailed(err);
      this.metrics.failed_requests++;
      this._emitTelemetry(req);
      throw err;
    }
  }

  /**
   * Get current budget status
   */
  getBudgetStatus() {
    const daily_remaining = this.token_budget_daily - this.daily_tokens_used;
    const daily_percent_used = (this.daily_tokens_used / this.token_budget_daily) * 100;

    return {
      daily_budget: this.token_budget_daily,
      daily_used: this.daily_tokens_used,
      daily_remaining,
      daily_percent_used: daily_percent_used.toFixed(2),
      budget_exhausted: this.budget_exhausted,
      hard_stop_threshold: (this.hard_stop_at * 100).toFixed(0) + '%',
      reset_at: this.daily_reset_at,
    };
  }

  /**
   * Get request history for a correlation_id
   */
  getRequest(correlation_id) {
    return this.requests.get(correlation_id);
  }

  /**
   * Get all requests matching a filter
   */
  getRequests(filter = {}) {
    const results = Array.from(this.requests.values());

    if (filter.subsystem) {
      return results.filter(r => r.subsystem === filter.subsystem);
    }
    if (filter.status) {
      return results.filter(r => r.status === filter.status);
    }
    if (filter.model) {
      return results.filter(r => r.model === filter.model);
    }

    return results;
  }

  /**
   * Get metrics snapshot
   */
  getMetrics() {
    const total = this.metrics.total_requests;
    const success_rate = total > 0 ? (this.metrics.successful_requests / total * 100).toFixed(2) : 0;

    return {
      ...this.metrics,
      success_rate: success_rate + '%',
      avg_completion_tokens: total > 0
        ? (this.metrics.total_tokens_used / this.metrics.successful_requests).toFixed(0)
        : 0,
    };
  }

  // =========================================================================
  // Internal helpers
  // =========================================================================

  _isModelAllowed(model) {
    // List of supported models (can be configured)
    const allowed = [
      'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
      'claude-opus', 'claude-sonnet', 'claude-haiku',
      'gemini-pro',
      'local-llama',
    ];
    return allowed.includes(model);
  }

  _dailyBudgetExhausted() {
    const threshold = this.token_budget_daily * this.hard_stop_at;
    return this.daily_tokens_used > threshold;
  }

  _trackTokenUsage(prompt_tokens, completion_tokens) {
    this.daily_tokens_used += (prompt_tokens + completion_tokens);

    if (this._dailyBudgetExhausted()) {
      this.budget_exhausted = true;
      console.warn(
        `[${MODULE}] daily budget threshold exceeded: ` +
        `${this.daily_tokens_used}/${this.token_budget_daily} tokens (${this.hard_stop_at * 100}% limit)`
      );
    }
  }

  _resetDailyBudget() {
    console.info(
      `[${MODULE}] resetting daily budget. Used: ${this.daily_tokens_used} tokens`
    );
    this.daily_tokens_used = 0;
    this.budget_exhausted = false;
    this.daily_reset_at = this._nextDailyReset();
  }

  _nextDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  _calculateCost(model, completion_tokens) {
    // Rough cost estimates (in USD, per 1M tokens)
    const costs = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0005,
      'claude-opus': 0.015,
      'claude-sonnet': 0.003,
      'claude-haiku': 0.00025,
      'gemini-pro': 0.0005,
      'local-llama': 0, // Free
    };

    const costPerToken = (costs[model] || 0) / 1000000;
    return completion_tokens * costPerToken;
  }

  _emitTelemetry(req) {
    const telemetry = req.toTelemetry();
    // In production, send to observability platform
    console.debug(`[${MODULE}] telemetry:`, JSON.stringify(telemetry));
  }
}
