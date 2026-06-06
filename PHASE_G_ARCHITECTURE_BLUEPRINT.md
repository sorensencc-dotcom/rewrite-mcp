# PHASE G ARCHITECTURE BLUEPRINT
**Autonomous Optimization Layer**

Phase G is where CIC becomes **self-tuning, self-optimizing, and self-correcting**.

This is the architecture that makes it happen.

---

## Phase G Vision

From Phase F (operator-visible) to Phase G (operator-guided):

| Aspect | Phase F | Phase G |
|--------|---------|---------|
| Visibility | UI shows system state | UI shows recommendations |
| Control | Operator adjusts config | System proposes optimizations |
| Feedback | Operator sees outcomes | System learns from outcomes |
| Response | Manual intervention | Autonomous action (approved) |

---

## Core Subsystems

### 1. Optimization Engine
```
src/optimization/
  Optimizer.ts              ← orchestrator
  ThresholdTuner.ts         ← auto-tune retries, breaker, cache TTLs
  RoutingPredictor.ts       ← predict fastest server path
  PipelineOptimizer.ts      ← reorder stages, skip redundant ones
  DriftCorrector.ts         ← detect + fix RECLASSIFICATION.md drift
  FeedbackLoop.ts           ← learn from operator decisions
```

---

### 2. Threshold Auto-Tuner

**Goal:** Automatically tune retry policy, circuit breaker, and cache TTLs.

**Signals:**
- Latency distributions (p50, p95, p99)
- Error rate trends
- Cache hit/miss ratios
- Retry convergence rates
- Breaker activation frequency

**Algorithm:**
```typescript
class ThresholdTuner {
  async recommend(): Promise<RecommendedConfig> {
    const metrics = await this.collectMetrics(24 * 60);  // last 24 hours

    // Retry Policy
    const avgRetries = metrics.avgRetryCount;
    const convergence = metrics.retryConvergenceTime;
    const recommendedMaxAttempts = avgRetries < 1.5 ? 2 : 3;
    const recommendedBackoff = convergence > 2000 ? 500 : 100;

    // Circuit Breaker
    const errorRate = metrics.errorRate;
    const failureThreshold = errorRate > 0.05 ? 3 : 5;
    const cooldownMs = metrics.mtbf > 3600000 ? 30000 : 60000;

    // Cache TTLs
    const hitRate = metrics.cacheHitRate;
    const newTTLs = this.recommendTTLs(hitRate);

    return {
      retry: { maxAttempts: recommendedMaxAttempts, initialDelayMs: recommendedBackoff },
      breaker: { failureThreshold, cooldownMs },
      cache: { ttls: newTTLs }
    };
  }

  private recommendTTLs(hitRate: number): Record<string, number> {
    // If hit rate < 70%, increase TTLs
    // If hit rate > 90%, decrease TTLs
    // If hit rate 70-90%, maintain
    return { /* computed TTLs */ };
  }
}
```

---

### 3. Predictive Routing Engine

**Goal:** Route flows to the fastest MCP server.

**Signals:**
- Per-server latency history (rolling 1-hour window)
- Error rate per server
- Version drift
- Current load factor

**Algorithm:**
```typescript
class RoutingPredictor {
  async selectServer(agent: string): Promise<string> {
    const serverMetrics = await this.getServerMetrics();

    // Score each server
    const scores = serverMetrics.map(sm => ({
      endpoint: sm.endpoint,
      score: this.computeScore(sm)
    }));

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Return highest-scoring server
    return scores[0].endpoint;
  }

  private computeScore(metric: ServerMetric): number {
    // Weighted scoring
    const latencyScore = 1 / (metric.p99Latency + 1);
    const errorScore = 1 / (metric.errorRate * 100 + 1);
    const healthScore = metric.healthy ? 1 : 0.1;

    return (latencyScore * 0.5) + (errorScore * 0.3) + (healthScore * 0.2);
  }
}
```

---

### 4. Pipeline Optimizer

**Goal:** Reorder stages, parallelize safe stages, skip redundant ones.

**Capabilities:**
- Detect independent stages (can run in parallel)
- Detect cache hits (skip stage execution)
- Reorder stages to minimize latency

**Algorithm:**
```typescript
class PipelineOptimizer {
  async optimizePipeline(pipeline: Pipeline): Promise<OptimizedPipeline> {
    // Compute stage dependencies
    const deps = this.computeDependencies(pipeline);

    // Identify parallelizable stages
    const parallelGroups = this.identifyParallelGroups(deps);

    // Check cache for stage outputs
    const cachedOutputs = await this.checkCache(pipeline);

    // Skip stages with cached outputs
    const skippablePipeline = this.skipCachedStages(pipeline, cachedOutputs);

    // Reorder to minimize latency
    const reorderedPipeline = this.reorderForLatency(skippablePipeline, parallelGroups);

    return reorderedPipeline;
  }

  private identifyParallelGroups(deps: DependencyGraph): Stage[][] {
    // Use topological sort to identify stages that can run in parallel
    return topologicalSort(deps);
  }
}
```

---

### 5. Drift Corrector

**Goal:** Detect drift in RECLASSIFICATION.md and auto-correct.

**Signals:**
- Changes to artifact classifications
- Changes to stage outputs
- Governance whitelist changes

**Algorithm:**
```typescript
class DriftCorrector {
  async detectDrift(): Promise<DriftProposal[]> {
    const currentReclassification = await this.loadReclassificationMd();
    const expectedReclassification = await this.computeExpectedReclassification();

    const diffs = this.diff(expectedReclassification, currentReclassification);

    return diffs.map(diff => ({
      type: diff.type,
      before: diff.before,
      after: diff.after,
      severity: this.assessSeverity(diff),
      autoFix: this.generateAutoFix(diff)
    }));
  }

  async proposeFix(proposal: DriftProposal): Promise<string> {
    // Generate PR with proposed changes
    const prBody = this.generatePRBody(proposal);
    const branchName = `phase-g/drift-fix-${Date.now()}`;

    return await this.createPR(branchName, prBody);
  }
}
```

---

### 6. Operator Feedback Loop

**Goal:** Learn from operator decisions and improve recommendations.

**Mechanism:**
- Operator approves/rejects optimization recommendations
- System records decision + outcome
- Feedback informs future recommendations

**Data Structure:**
```typescript
interface OperatorDecision {
  recommendationId: string;
  approved: boolean;
  timestamp: number;
  outcome?: {
    latencyReduction?: number;
    errorRateChange?: number;
    userNotes?: string;
  };
}

interface FeedbackModel {
  decisions: OperatorDecision[];

  learnFrom(decision: OperatorDecision) {
    if (decision.approved && decision.outcome?.latencyReduction! > 0) {
      // Increase confidence in similar recommendations
    }
  }
}
```

---

## System Interactions

### Daily Cycle

**1. Collection (hourly)**
- Collect metrics: latency, errors, cache, retries, breaker
- Compute rolling statistics: p50, p95, p99

**2. Analysis (hourly)**
- ThresholdTuner analyzes metrics → threshold recommendations
- RoutingPredictor analyzes server health → routing recommendations
- PipelineOptimizer analyzes DAG → optimization recommendations
- DriftCorrector analyzes RECLASSIFICATION.md → drift proposals

**3. Recommendation (every 6 hours)**
- Aggregate all recommendations
- Filter out low-confidence recommendations
- Present to operator via console

**4. Operator Action (on-demand)**
- Operator approves or rejects
- System executes approved changes (with human approval)
- System records feedback

**5. Learning (continuous)**
- FeedbackLoop updates confidence scores
- System improves future recommendations

---

## API Contracts

### Recommendations

```
GET /api/optimization/recommendations
Returns: Recommendation[]

interface Recommendation {
  id: string;
  type: "threshold" | "routing" | "pipeline" | "drift";
  confidence: number;           // 0.0-1.0
  expectedImprovement: {
    latencyReductionPercent?: number;
    errorRateReductionPercent?: number;
  };
  proposedConfig: any;
  explanation: string;
}
```

### Approvals

```
POST /api/optimization/approve/{recommendationId}
Body: { approved: boolean, notes?: string }
Returns: { success: boolean }
```

### Feedback

```
POST /api/optimization/feedback/{recommendationId}
Body: {
  latencyReduction?: number,
  errorRateChange?: number,
  userNotes?: string
}
Returns: { success: boolean }
```

---

## Constraints & Safeguards

### No Autonomous Changes
- All recommendations require operator approval
- No automatic config changes
- Operator can always override

### Confidence Thresholds
- Low confidence (< 0.6) recommendations hidden by default
- High confidence (> 0.9) recommendations highlighted
- Medium confidence (0.6-0.9) shown with caveats

### Rollback Safety
- Every change logged with undo capability
- Previous config always restorable
- Audit trail complete

### Bounded Scope
- Tuning only affects: retry, breaker, cache TTLs
- Never changes: execution pipeline, MCP endpoints, core logic
- User must approve any structural changes

---

## Success Metrics (Phase G)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Latency improvement | 10% reduction | Compare before/after recommendations |
| Cache hit rate | 80%+ | TTL recommendations optimize this |
| Error rate | < 0.05% | Breaker tuning optimizes this |
| Operator approval rate | > 70% | Track approvals/rejections |
| Feedback quality | High | User notes help improve model |

---

## Phase G Deliverables

### Code
- ThresholdTuner (200 lines)
- RoutingPredictor (150 lines)
- PipelineOptimizer (200 lines)
- DriftCorrector (250 lines)
- FeedbackLoop (100 lines)
- API endpoints (100 lines)

### UI
- Recommendations dashboard
- Approval UI
- Feedback form
- Confidence visualization

### Tests
- Unit tests (all tuners)
- Integration tests (feedback loop)
- E2E tests (recommendation → approval → execution)

### Documentation
- Phase G Operator Guide
- Phase G Architecture
- Phase G Runbooks

---

## Transition from Phase F to Phase G

**Phase F End State:**
- Operator Console fully functional
- All metrics visible
- Config editable manually

**Phase G Start State:**
- Same as Phase F, plus:
- Recommendations API
- Operator approval UI
- FeedbackLoop enabled

**Phase G End State:**
- System is self-optimizing
- Operator is approver, not tuner
- Continuous learning loop active
