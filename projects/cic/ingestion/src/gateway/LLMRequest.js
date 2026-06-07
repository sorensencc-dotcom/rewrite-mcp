/**
 * LLMRequest.js
 * @version 0.1.0
 * @date 2026-05-31
 *
 * Standardized request object for all LLM calls through the token economy gateway.
 * Ensures consistent token accounting, budget enforcement, and error handling.
 *
 * Usage:
 *   const req = LLMRequest.create({
 *     model: 'gpt-4',
 *     prompt: 'User query',
 *     max_tokens: 256,
 *     subsystem: 'harvester',
 *     correlation_id: 'abc-123',
 *   });
 *
 *   const result = await gateway.execute(req);
 *   // result: { completion: string, tokens_prompt: number, tokens_completion: number, cost: number }
 */

const MODULE = 'LLMRequest';

/**
 * @typedef {Object} LLMRequestConfig
 * @property {string}  model              - Model identifier (e.g., 'gpt-4', 'claude-opus', 'local-llama')
 * @property {string}  prompt             - Full compiled prompt text
 * @property {number}  max_tokens         - Maximum completion tokens allowed
 * @property {string}  [subsystem]        - Source subsystem (harvester, controller, etc.)
 * @property {string}  [correlation_id]   - Trace ID for debugging
 * @property {number}  [priority]         - Priority level (0-100, higher = more important)
 * @property {number}  [timeout_ms]       - Request timeout in milliseconds
 * @property {Object}  [metadata]         - Additional context (file path, user_id, etc.)
 * @property {number}  [budget_tokens]    - Token budget override (if different from max_tokens)
 */

export class LLMRequest {
  constructor(config) {
    // Validation
    if (!config.model || typeof config.model !== 'string') {
      throw new Error(`[${MODULE}] model is required and must be a string`);
    }
    if (typeof config.prompt !== 'string' || !config.prompt.length) {
      throw new Error(`[${MODULE}] prompt must be a non-empty string`);
    }
    if (!Number.isFinite(config.max_tokens) || config.max_tokens < 1) {
      throw new Error(`[${MODULE}] max_tokens must be a positive integer`);
    }

    // Core fields
    this.model = config.model;
    this.prompt = config.prompt;
    this.max_tokens = config.max_tokens;

    // Optional fields with defaults
    this.subsystem = config.subsystem || 'unknown';
    this.correlation_id = config.correlation_id || this._generateCorrelationId();
    this.priority = config.priority ?? 50;
    this.timeout_ms = config.timeout_ms ?? 30000;
    this.metadata = config.metadata || {};

    // Token budget can be different from max_tokens (for cases where model uses less)
    this.budget_tokens = config.budget_tokens ?? config.max_tokens;

    // Request lifecycle
    this.created_at = new Date().toISOString();
    this.started_at = null;
    this.completed_at = null;

    // Token accounting
    this.tokens_prompt = 0;
    this.tokens_completion = 0;
    this.tokens_estimated = this._estimateTokens();

    // Status tracking
    this.status = 'pending';
    this.error = null;
    this.retries = 0;
  }

  /**
   * Mark request as started (called by gateway before model call)
   */
  markStarted() {
    this.started_at = new Date().toISOString();
    this.status = 'executing';
  }

  /**
   * Mark request as completed with actual token counts
   */
  markCompleted(tokens_prompt, tokens_completion) {
    this.completed_at = new Date().toISOString();
    this.tokens_prompt = tokens_prompt;
    this.tokens_completion = tokens_completion;
    this.status = 'completed';
  }

  /**
   * Mark request as failed
   */
  markFailed(error) {
    this.completed_at = new Date().toISOString();
    this.error = error;
    this.status = 'failed';
  }

  /**
   * Check if request exceeds budget
   */
  exceedsBudget() {
    return this.tokens_completion > this.budget_tokens;
  }

  /**
   * Get execution duration in milliseconds
   */
  getDurationMs() {
    if (!this.started_at || !this.completed_at) {
      return null;
    }
    return new Date(this.completed_at) - new Date(this.started_at);
  }

  /**
   * Estimate token count from prompt length (conservative: 4 chars/token)
   */
  _estimateTokens() {
    return Math.ceil(this.prompt.length / 4);
  }

  /**
   * Generate unique correlation ID
   */
  _generateCorrelationId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export as structured telemetry object
   */
  toTelemetry() {
    return {
      request_id: this.correlation_id,
      model: this.model,
      subsystem: this.subsystem,
      status: this.status,
      tokens_prompt: this.tokens_prompt,
      tokens_completion: this.tokens_completion,
      tokens_budget: this.budget_tokens,
      duration_ms: this.getDurationMs(),
      retries: this.retries,
      error: this.error ? this.error.message : null,
      created_at: this.created_at,
      completed_at: this.completed_at,
    };
  }

  /**
   * Validate request against gateway constraints before execution
   */
  validate(gateway_config) {
    const errors = [];

    if (this.budget_tokens > gateway_config.max_per_request_tokens) {
      errors.push(
        `budget_tokens (${this.budget_tokens}) exceeds gateway limit ` +
        `(${gateway_config.max_per_request_tokens})`
      );
    }

    if (this.tokens_estimated > gateway_config.max_prompt_tokens) {
      errors.push(
        `estimated prompt tokens (${this.tokens_estimated}) exceeds gateway limit ` +
        `(${gateway_config.max_prompt_tokens})`
      );
    }

    if (this.timeout_ms > gateway_config.max_timeout_ms) {
      errors.push(
        `timeout_ms (${this.timeout_ms}) exceeds gateway limit ` +
        `(${gateway_config.max_timeout_ms})`
      );
    }

    if (errors.length > 0) {
      throw new Error(`[${MODULE}] request validation failed: ${errors.join('; ')}`);
    }

    return true;
  }

  /**
   * Factory method for creating requests
   */
  static create(config) {
    return new LLMRequest(config);
  }

  /**
   * Create request from legacy modelClient.complete() params
   * (For backward compatibility during migration)
   */
  static fromLegacyParams({ model, prompt, max_tokens, subsystem, correlation_id }) {
    return new LLMRequest({
      model,
      prompt,
      max_tokens,
      subsystem: subsystem || 'legacy',
      correlation_id,
    });
  }
}
