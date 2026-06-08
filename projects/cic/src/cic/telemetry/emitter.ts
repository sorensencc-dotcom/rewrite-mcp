import fs from "node:fs";
import path from "node:path";

/**
 * CIC LLM Call Event
 * Represents a single LLM call routed through CIC.
 */
export interface CicLlmCallEvent {
  timestamp: string;
  agent: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  latency_ms: number;
  retry_count: number;
  task_type: string;
  pipeline_stage: string;
  project: string;
  session_id: string;
  correlation_id: string;
}

/**
 * CIC Routing Decision Event
 * Represents a routing decision made by TokenEconomyAgent.
 */
export interface CicRoutingDecisionEvent {
  timestamp: string;
  agent: string;
  requested_model: string;
  selected_model: string;
  reason: string;
  budget_class: string;
  max_tokens: number;
  correlation_id: string;
}

/**
 * CIC Cost Event
 * Aggregated cost tracking for billing and optimization.
 */
export interface CicCostEvent {
  timestamp: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_cost_usd: number;
  pipeline_stage: string;
  project: string;
  agent: string;
  session_id: string;
}

const TELEMETRY_DIR = process.env.CIC_TELEMETRY_DIR || path.join(process.env.HOME || ".", ".cic", "logs", "telemetry");

/**
 * Emit a CIC LLM call event to the telemetry log
 */
export function emitCicLlmCall(event: CicLlmCallEvent): void {
  const file = path.join(TELEMETRY_DIR, "llm_calls.jsonl");
  const line = JSON.stringify({ type: "llm_call", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Emit a routing decision event
 */
export function emitRoutingDecision(event: CicRoutingDecisionEvent): void {
  const file = path.join(TELEMETRY_DIR, "routing_decisions.jsonl");
  const line = JSON.stringify({ type: "routing_decision", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Emit a cost event for billing aggregation
 */
export function emitCostEvent(event: CicCostEvent): void {
  const file = path.join(TELEMETRY_DIR, "cost_events.jsonl");
  const line = JSON.stringify({ type: "cost_event", ...event }) + "\n";
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  fs.appendFileSync(file, line, "utf8");
}

/**
 * Calculate cost for a call based on token counts and model pricing
 */
export function calculateCallCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number
): number {
  // Placeholder pricing — will be updated with real rates
  const pricing: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
    "claude-3.7-opus": { input: 0.015, output: 0.075, cacheRead: 0.00375, cacheWrite: 0.01875 },
    "claude-3.7-sonnet": { input: 0.003, output: 0.015, cacheRead: 0.00075, cacheWrite: 0.00375 },
    "claude-3.7-haiku": { input: 0.00080, output: 0.0024, cacheRead: 0.0002, cacheWrite: 0.0006 }
  };

  const modelPricing = pricing[model] || { input: 0.01, output: 0.05, cacheRead: 0.0025, cacheWrite: 0.0125 };

  return (
    inputTokens * modelPricing.input +
    outputTokens * modelPricing.output +
    cacheReadTokens * modelPricing.cacheRead +
    cacheWriteTokens * modelPricing.cacheWrite
  );
}
