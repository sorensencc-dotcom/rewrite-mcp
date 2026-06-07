/**
 * llmGateway.js
 * @version 0.1.0
 * @date 2026-05-31
 *
 * Central LLM request gateway with token economy enforcement.
 * All LLM calls from the CIC pipeline route through this gateway.
 *
 * Architecture:
 *   1. Create LLMRequest from call params
 *   2. Validate via TokenEconomyAgent
 *   3. Route to appropriate model client
 *   4. Track tokens and enforce budget
 *   5. Return standardized result or error
 *
 * Usage:
 *   const gateway = new LLMGateway(tokenEconomyAgent, modelClients);
 *   const result = await gateway.call({
 *     model: 'gpt-4',
 *     prompt: 'Your prompt here',
 *     max_tokens: 256,
 *     subsystem: 'harvester',
 *   });
 */

import { LLMRequest } from './LLMRequest.js';
import { TokenEconomyAgent } from './TokenEconomyAgent.js';

const MODULE = 'llmGateway';

export class LLMGateway {
  constructor(tokenEconomyAgent, modelClients = {}) {
    if (!(tokenEconomyAgent instanceof TokenEconomyAgent)) {
      throw new Error(`[${MODULE}] tokenEconomyAgent must be a TokenEconomyAgent instance`);
    }

    this.agent = tokenEconomyAgent;
    this.modelClients = modelClients; // { model_name: client_instance }
    this.requestLog = [];
  }

  /**
   * Main entry point for LLM calls
   * @param {Object} params - Request parameters
   * @param {string} params.model - Model identifier
   * @param {string} params.prompt - Compiled prompt text
   * @param {number} params.max_tokens - Max completion tokens
   * @param {string} [params.subsystem] - Source subsystem
   * @param {string} [params.correlation_id] - Trace ID
   * @returns {Promise<{completion: string, tokens_prompt: number, tokens_completion: number, cost: number}>}
   */
  async call(params) {
    // Create structured request
    const req = LLMRequest.create({
      model: params.model,
      prompt: params.prompt,
      max_tokens: params.max_tokens,
      subsystem: params.subsystem,
      correlation_id: params.correlation_id,
      timeout_ms: params.timeout_ms,
      metadata: params.metadata,
    });

    // Get model client
    const modelClient = this._getModelClient(req.model);
    if (!modelClient) {
      const err = new Error(`[${MODULE}] no model client configured for '${req.model}'`);
      req.markFailed(err);
      this.requestLog.push(req);
      throw err;
    }

    try {
      // Execute through token economy agent
      const result = await this.agent.executeRequest(req, modelClient);

      // Log request
      this.requestLog.push(req);

      return result;
    } catch (err) {
      // Log failed request
      this.requestLog.push(req);
      throw err;
    }
  }

  /**
   * Call with automatic retry on transient failures
   */
  async callWithRetry(params, maxRetries = 2, backoffMs = 300) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.call(params);
      } catch (err) {
        lastError = err;

        // Don't retry budget/validation errors
        if (err.message.includes('validation failed') || err.message.includes('budget')) {
          throw err;
        }

        if (attempt < maxRetries - 1) {
          const delayMs = backoffMs * (attempt + 1);
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    throw lastError;
  }

  /**
   * Register a model client
   */
  registerModel(modelName, client) {
    if (!client || typeof client.complete !== 'function') {
      throw new Error(`[${MODULE}] client must expose a .complete(params) method`);
    }
    this.modelClients[modelName] = client;
  }

  /**
   * Get gateway status and metrics
   */
  getStatus() {
    const budget = this.agent.getBudgetStatus();
    const metrics = this.agent.getMetrics();

    return {
      gateway: MODULE,
      timestamp: new Date().toISOString(),
      models_available: Object.keys(this.modelClients),
      budget,
      metrics,
      request_log_size: this.requestLog.length,
    };
  }

  /**
   * Get detailed request history
   */
  getRequestHistory(filter = {}, limit = 100) {
    const requests = this.agent.getRequests(filter);
    return requests
      .slice(-limit)
      .map(req => ({
        correlation_id: req.correlation_id,
        model: req.model,
        subsystem: req.subsystem,
        status: req.status,
        tokens_prompt: req.tokens_prompt,
        tokens_completion: req.tokens_completion,
        duration_ms: req.getDurationMs(),
        created_at: req.created_at,
        error: req.error ? req.error.message : null,
      }));
  }

  /**
   * Export request log as CSV for analysis
   */
  exportRequestLogCSV() {
    const headers = [
      'correlation_id',
      'model',
      'subsystem',
      'status',
      'tokens_prompt',
      'tokens_completion',
      'duration_ms',
      'created_at',
      'error',
    ];

    const rows = this.requestLog.map(req => [
      req.correlation_id,
      req.model,
      req.subsystem,
      req.status,
      req.tokens_prompt,
      req.tokens_completion,
      req.getDurationMs() ?? '',
      req.created_at,
      req.error ? req.error.message : '',
    ]);

    // CSV formatting
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === 'string' && cell.includes(',')
            ? `"${cell.replace(/"/g, '""')}"` // Escape quotes in strings
            : cell
        ).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  // =========================================================================
  // Internal helpers
  // =========================================================================

  _getModelClient(modelName) {
    return this.modelClients[modelName] || null;
  }
}

/**
 * Factory function to create a pre-configured gateway
 */
export function createLLMGateway(config = {}) {
  const tokenEconomyAgent = new TokenEconomyAgent({
    max_per_request_tokens: config.max_per_request_tokens ?? 8000,
    max_prompt_tokens: config.max_prompt_tokens ?? 32000,
    max_completion_tokens: config.max_completion_tokens ?? 4096,
    token_budget_daily: config.token_budget_daily ?? 1000000,
  });

  const gateway = new LLMGateway(tokenEconomyAgent, config.modelClients || {});

  return gateway;
}
