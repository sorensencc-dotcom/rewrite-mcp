/**
 * Resilience Service (Circuit Breaker, Retry, DLQ)
 * Specification: CIC-SPEC-MCP-001 v1.2 §7
 */

import { v4 as uuidv4 } from "uuid";
import { EventEnvelope, DLQEntry } from "./types.js";

// ============================================================================
// CIRCUIT BREAKER PATTERN (§7.2)
// ============================================================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface RequestRecord {
  timestamp: number;
  success: boolean;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private records: RequestRecord[] = [];
  private lastStateChange: number = Date.now();
  private openTimeoutMs = 30000; // 30 seconds cooldown before probing
  private rollingWindowMs = 60000; // 60-second rolling window
  private minRequestsForTrip = 10; // min 10 requests per window
  private failureRateThreshold = 0.5; // 50%

  constructor(openTimeoutMs = 30000, rollingWindowMs = 60000, minRequests = 10, threshold = 0.5) {
    this.openTimeoutMs = openTimeoutMs;
    this.rollingWindowMs = rollingWindowMs;
    this.minRequestsForTrip = minRequests;
    this.failureRateThreshold = threshold;
  }

  public getState(): CircuitState {
    this.checkCooldown();
    return this.state;
  }

  public recordSuccess(): void {
    this.checkCooldown();
    this.addRecord(true);
    if (this.state === "HALF_OPEN") {
      this.transitionTo("CLOSED");
    }
  }

  public recordFailure(): void {
    this.checkCooldown();
    this.addRecord(false);

    const activeRecords = this.getActiveRecords();
    if (this.state === "CLOSED" && activeRecords.length >= this.minRequestsForTrip) {
      const failures = activeRecords.filter(r => !r.success).length;
      const rate = failures / activeRecords.length;
      if (rate >= this.failureRateThreshold) {
        this.transitionTo("OPEN");
      }
    } else if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN");
    }
  }

  private addRecord(success: boolean): void {
    this.records.push({
      timestamp: Date.now(),
      success,
    });
    this.pruneOldRecords();
  }

  private pruneOldRecords(): void {
    const cutoff = Date.now() - this.rollingWindowMs;
    this.records = this.records.filter(r => r.timestamp >= cutoff);
  }

  private getActiveRecords(): RequestRecord[] {
    this.pruneOldRecords();
    return this.records;
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = Date.now();
    this.records = []; // Clear records on state change
  }

  private checkCooldown(): void {
    if (this.state === "OPEN" && Date.now() - this.lastStateChange >= this.openTimeoutMs) {
      this.transitionTo("HALF_OPEN");
    }
  }

  // Force-reset for testing
  public reset(): void {
    this.transitionTo("CLOSED");
  }
}

// ============================================================================
// RETRY POLICY WITH EXPONENTIAL BACKOFF & JITTER (§7.1)
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Executes a function with exponential backoff and full jitter retry logic.
 * Formula: sleep = random(0, min(max_delay, initial_delay * 2^attempt))
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  isRetryable: (error: any) => boolean,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let attempt = 0;
  let delay = config.initialDelayMs;

  while (true) {
    try {
      attempt++;
      return await fn(attempt);
    } catch (error) {
      if (attempt >= config.maxAttempts || !isRetryable(error)) {
        throw error;
      }

      // Computed delay without jitter: min(maxDelayMs, initialDelay * multiplier^(attempt-1))
      const computedDelay = Math.min(config.maxDelayMs, delay * Math.pow(config.backoffMultiplier, attempt - 1));
      
      // Full Jitter: random value in [0, computed_delay]
      const jitteredDelay = Math.random() * computedDelay;

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
      delay = computedDelay;
    }
  }
}

/**
 * Determines if an HTTP error is retryable (§7.1)
 */
export function isHttpErrorRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 504);
}

// ============================================================================
// DEAD-LETTER QUEUE (DLQ) SERVICE (§7.3)
// ============================================================================

export class DLQService {
  private queue: DLQEntry[] = [];
  private warningThreshold = 100;
  private criticalThreshold = 500;

  constructor(warning = 100, critical = 500) {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
  }

  /**
   * Pushes a failed event to the DLQ.
   */
  public push(event: EventEnvelope, error: Error, code = "UNKNOWN_ERROR", attempts = 5): DLQEntry {
    const entry: DLQEntry = {
      id: uuidv4(),
      event,
      failed_at: new Date().toISOString(),
      attempts,
      error_message: error.message,
      error_code: code,
    };

    this.queue.push(entry);
    this.checkThresholds();
    return entry;
  }

  /**
   * Lists all entries in the DLQ.
   */
  public list(): DLQEntry[] {
    return [...this.queue];
  }

  /**
   * Replays an entry by ID.
   */
  public replay(id: string, executeReplay: (event: EventEnvelope) => Promise<void>): Promise<boolean> {
    const index = this.queue.findIndex(entry => entry.id === id);
    if (index === -1) {
      return Promise.resolve(false);
    }

    const entry = this.queue[index];
    return executeReplay(entry.event)
      .then(() => {
        this.queue.splice(index, 1);
        return true;
      })
      .catch((err) => {
        entry.attempts++;
        entry.failed_at = new Date().toISOString();
        entry.error_message = err.message;
        return false;
      });
  }

  public getDepth(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }

  private checkThresholds(): void {
    const depth = this.queue.length;
    if (depth >= this.criticalThreshold) {
      console.error(`[DLQ ALERT] Critical threshold breached! DLQ depth is ${depth} >= ${this.criticalThreshold}. Triggering PagerDuty alert.`);
    } else if (depth >= this.warningThreshold) {
      console.warn(`[DLQ WARNING] Warning threshold breached! DLQ depth is ${depth} >= ${this.warningThreshold}.`);
    }
  }
}

export const contextEngineCircuitBreaker = new CircuitBreaker();
export const mcpDLQService = new DLQService();
