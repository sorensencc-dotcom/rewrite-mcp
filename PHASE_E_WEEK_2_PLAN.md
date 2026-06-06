# PHASE E WEEK 2 PLAN — RESILIENCE + METRICS
*(5-day implementation plan, deterministic, operator-grade)*

Week 2 is where the system becomes **fault-tolerant**, **self-healing**, and **observable at scale**.
This is the week that transforms Ruflo+CIC from "multi-instance capable" to "production-resilient."

---

## WEEK 2 GOAL
**Integrate retry logic, circuit breakers, structured error envelopes, and full metrics emission (OpenTelemetry).**

Outcome: 95%+ success rate under failure injection.

---

## DAY 1 — Retry Engine (Exponential Backoff + Jitter)

### Deliverables
- `src/resilience/RetryPolicy.ts` (new)
- Exponential backoff strategy
- Jitter implementation
- Error classification (retryable vs non-retryable)

### Implementation Strategy
```typescript
// RetryPolicy.ts
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class RetryPolicy {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        
        if (!this.isRetryable(err) || attempt === config.maxAttempts) {
          throw err;
        }
        
        const delay = this.calculateBackoff(attempt, config);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof TimeoutError) return true;
    if (err instanceof NetworkError) return true;
    if (err instanceof CircuitBreakerOpenError) return false;
    return false;
  }

  private calculateBackoff(attempt: number, config: RetryConfig): number {
    const exponential = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const capped = Math.min(exponential, config.maxDelayMs);
    const jitter = capped * (0.5 + Math.random() * 0.5);
    return Math.floor(jitter);
  }
}
```

### Integration Points
- `src/mcp/MCPClient.ts` — retry MCP calls
- `src/agents/CachedAgentClient.ts` — retry cache misses
- `src/orchestration/FlowOrchestrator.ts` — retry stage failures

### Tests
- [ ] `tests/resilience/RetryPolicy.test.ts`
  - Retry on transient failure (TimeoutError)
  - No retry on validation errors
  - Backoff timing correctness (exponential growth)
  - Jitter in delays
  - Max attempts enforced

### Success Criteria
- All retries succeed within max attempts
- Non-retryable errors fail immediately
- Backoff times monotonically increase

---

## DAY 2 — Circuit Breaker Integration

### Deliverables
- `src/resilience/CircuitBreaker.ts` (new)
- Three states: closed, open, half-open
- Per-agent breaker state tracking
- Configurable thresholds

### Implementation Strategy
```typescript
// CircuitBreaker.ts
export enum BreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // failures before opening
  successThreshold: number;       // successes to close from half-open
  cooldownMs: number;            // time before half-open
}

export class CircuitBreaker {
  private state: BreakerState = BreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;

  async execute<T>(fn: () => Promise<T>, config: CircuitBreakerConfig): Promise<T> {
    if (this.state === BreakerState.OPEN) {
      if (this.shouldAttemptReset(config)) {
        this.state = BreakerState.HALF_OPEN;
      } else {
        throw new CircuitBreakerOpenError(`Breaker open for ${this.agent}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(config);
      return result;
    } catch (err) {
      this.onFailure(config);
      throw err;
    }
  }

  private onSuccess(config: CircuitBreakerConfig): void {
    this.failureCount = 0;
    
    if (this.state === BreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= config.successThreshold) {
        this.state = BreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(config: CircuitBreakerConfig): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === BreakerState.HALF_OPEN) {
      this.state = BreakerState.OPEN;
    } else if (this.failureCount >= config.failureThreshold) {
      this.state = BreakerState.OPEN;
    }
  }

  private shouldAttemptReset(config: CircuitBreakerConfig): boolean {
    return Date.now() - (this.lastFailureTime || 0) >= config.cooldownMs;
  }
}
```

### Integration Points
- `src/mcp/MCPClient.ts` — per-server breaker
- `src/agents/RealAgentClient.ts` — per-agent breaker
- `src/orchestration/FlowOrchestrator.ts` — breaker state visibility

### Tests
- [ ] `tests/resilience/CircuitBreaker.test.ts`
  - Closed → Open (after threshold failures)
  - Open → Half-Open (after cooldown)
  - Half-Open → Closed (after success threshold)
  - Half-Open → Open (on failure)
  - Breaker state transitions logged

### Success Criteria
- All state transitions correct
- Breaker prevents cascading failures
- Recovery mechanism works

---

## DAY 3 — Structured Error Envelopes

### Deliverables
- `src/errors/ErrorEnvelope.ts` (new)
- Unified error structure
- Error classification
- Propagation across system boundaries

### Implementation Strategy
```typescript
// ErrorEnvelope.ts
export type ErrorClassification = 'fatal' | 'transient' | 'validation' | 'infrastructure';

export interface ErrorEnvelope {
  type: string;
  message: string;
  classification: ErrorClassification;
  agent?: string;
  stage?: string;
  correlationId?: string;
  traceId?: string;
  retryCount?: number;
  breakerState?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  cause?: Error;
}

export class ErrorEnvelopeFactory {
  static createEnvelope(
    error: Error,
    context: {
      agent?: string;
      stage?: string;
      correlationId?: string;
      retryCount?: number;
      breakerState?: string;
    }
  ): ErrorEnvelope {
    return {
      type: error.constructor.name,
      message: error.message,
      classification: this.classify(error),
      agent: context.agent,
      stage: context.stage,
      correlationId: context.correlationId,
      retryCount: context.retryCount,
      breakerState: context.breakerState,
      timestamp: new Date(),
      cause: error
    };
  }

  private static classify(error: Error): ErrorClassification {
    if (error instanceof TimeoutError) return 'transient';
    if (error instanceof NetworkError) return 'transient';
    if (error instanceof ValidationError) return 'validation';
    if (error instanceof CircuitBreakerOpenError) return 'infrastructure';
    return 'fatal';
  }
}
```

### Integration Points
- All error throwing points in codebase
- Error span creation
- Logging infrastructure
- Retry/breaker decision logic

### Tests
- [ ] `tests/errors/ErrorEnvelope.test.ts`
  - Envelope creation and enrichment
  - Classification correctness
  - Propagation across Ruflo → MCP → Ruflo
  - Error spans include full envelope

### Success Criteria
- All errors wrapped in envelopes
- Classification deterministic
- No envelope mutation after creation

---

## DAY 4 — Metrics Emission (OpenTelemetry)

### Deliverables
- `src/observability/MetricsExporter.ts` (new)
- Metric collectors for all phases
- OTel SDK integration
- Metric naming conventions

### Implementation Strategy
```typescript
// MetricsExporter.ts
import { metrics } from '@opentelemetry/api';

export class MetricsExporter {
  private meter = metrics.getMeter('cic-main-pipeline');

  // Histograms
  stageLatency = this.meter.createHistogram('stage.latency', {
    unit: 'ms'
  });

  mcpLatency = this.meter.createHistogram('mcp.latency', {
    unit: 'ms'
  });

  // Counters
  retryCount = this.meter.createCounter('retry.count');
  cacheHits = this.meter.createCounter('cache.hits');
  cacheMisses = this.meter.createCounter('cache.misses');
  breakerTrips = this.meter.createCounter('breaker.trips');

  // Gauges
  breakerState = this.meter.createObservableGauge('breaker.state');

  recordStageLatency(stage: string, latencyMs: number, traceId: string): void {
    this.stageLatency.record(latencyMs, {
      'stage': stage,
      'trace_id': traceId
    });
  }

  recordMCPLatency(agent: string, method: string, latencyMs: number): void {
    this.mcpLatency.record(latencyMs, {
      'agent': agent,
      'method': method
    });
  }

  recordCacheHit(agent: string, method: string): void {
    this.cacheHits.add(1, {
      'agent': agent,
      'method': method
    });
  }

  recordRetry(agent: string, retryCount: number): void {
    this.retryCount.add(1, {
      'agent': agent,
      'retry_count': retryCount
    });
  }
}
```

### Configuration
- OTel exporter: stdout (dev) or OTLP (prod)
- Sampling strategy: 100% for Phase E (tune in Phase F)
- Metric export interval: 10s

### Tests
- [ ] `tests/observability/MetricsExporter.test.ts`
  - Metrics emitted for each stage
  - Metrics include trace + correlation IDs
  - Metrics survive multi-instance execution
  - Metric values correct

### Success Criteria
- All key metrics emitted
- Metrics include proper labels
- No metric drop-off under load

---

## DAY 5 — Failure Injection + Resilience Validation

### Deliverables
- `tests/resilience/FailureInjection.test.ts` (new)
- 20 test scenarios
- Comprehensive validation suite

### Scenarios
1. **MCP Server Timeout** — Verify retry + eventual recovery
2. **MCP Server Crash** — Verify circuit breaker opens
3. **Malformed MCP Response** — Verify error envelope
4. **Network Jitter** — Verify no cascading retries
5. **Partial Pipeline Failure** — Verify error propagates correctly
6. **Cache Corruption** — Verify fallback to real agent
7. **Breaker Stuck Open** — Verify manual reset capability
8. **Concurrent Executions** — Verify isolation
9. **Retry Storm** — Verify backoff prevents DOS
10. **Circuit Breaker Recovery** — Verify half-open → closed

### Execution
```bash
npm run test:failure-injection -- --scenarios 20 --duration 1h
```

### Expected Results
- ✓ 95%+ success rate
- ✓ No infinite retry loops
- ✓ No deadlocks
- ✓ No orphan spans
- ✓ Graceful degradation under failure

### Success Criteria
- All 20 scenarios pass
- Success rate ≥ 95%
- Metrics correctly recorded
- No unhandled rejections

---

## Week 2 Completion Gate

### Requirements
- [ ] RetryPolicy implemented + tested
- [ ] CircuitBreaker implemented + tested
- [ ] ErrorEnvelope unified + propagated
- [ ] Metrics emitting for all key signals
- [ ] 20/20 failure injection scenarios pass
- [ ] 95%+ success rate under failure
- [ ] Zero critical issues
- [ ] All tests green

### Outcome
Ready for Phase E Week 3 (Config + Hardening + Runbooks)
