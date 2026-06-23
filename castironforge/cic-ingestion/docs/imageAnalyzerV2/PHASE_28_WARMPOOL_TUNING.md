# Phase 28: ImageAnalyzerV2 Warm-Pool Tuning & Model Lifecycle

**Version:** 1.0.0  
**Date:** 2026-06-22  
**Scope:** Local-LLM integration, GPU memory budgeting, warm-pool hooks  
**Audience:** CIC operators, DevOps, performance engineers

---

## Overview

Phase 28 integrates ImageAnalyzerV2 into CIC's warm-pool model lifecycle management. This means:

- **Models stay warm** — no cold starts, predictable latency
- **GPU memory budgeted** — no OOM thrashing, graceful eviction
- **Lifecycle hooks** — load/unload events trigger proper cleanup
- **Concurrency controlled** — per-model request queuing prevents bottlenecks
- **Cost optimized** — local extraction preferred, remote fallback only when necessary

This document covers:

1. **Warm-pool configuration** for ImageAnalyzerV2
2. **GPU memory allocation** strategy
3. **Model lifecycle hooks** (load, unload, health-check)
4. **Concurrency tuning** (queue depth, timeout, retry)
5. **OOM recovery** procedure
6. **Monitoring & observability** hooks

---

## Part 1: Warm-Pool Configuration

### Assumption: WarmPoolManager Interface

```typescript
interface WarmPoolManager {
  forModel(modelId: string): WarmPoolManager;
  
  // Lifecycle
  acquireModel(): Promise<LoadedModel>;
  releaseModel(model: LoadedModel): Promise<void>;
  
  // Health & Status
  getStatus(): Promise<PoolStatus>;
  signalOOMRecovery(): Promise<void>;
  
  // Tuning
  setMaxConcurrent(n: number): void;
  setIdleTimeout(ms: number): void;
  setEvictionPolicy(policy: 'lru' | 'lfu' | 'fifo'): void;
}

interface PoolStatus {
  healthy: boolean;
  oomRecovering: boolean;
  modelCount: number;
  queueDepth: number;
  gpuMemoryMB: number;
  gpuMemoryFreeMB: number;
}

interface LoadedModel {
  name: string;
  version: string;
  analyzeImageStreaming(path: string): AsyncIterable<any>;
  analyzeImageBatch(path: string): Promise<any>;
  getGpuMemoryUsageMB(): Promise<number>;
  release(): Promise<void>;
}
```

### Recommended Configuration for ImageAnalyzerV2

```typescript
// src/cic/config/analyzers/imageAnalyzerV2.config.ts

export const imageAnalyzerV2Config = {
  modelId: 'image_analyzer_v2',
  
  // Model selection
  localModel: {
    name: 'llava-1.5', // or 'minicpm-v', 'internvl', etc.
    version: '1.5.0',
    quantization: 'int8', // 'int8', 'int4', or 'fp16'
    device: 'cuda', // 'cuda', 'cpu', or 'auto'
  },

  // Warm-pool tuning
  warmPool: {
    maxConcurrentRequests: 4, // Per GPU
    idleTimeoutMs: 5 * 60_000, // 5 min — unload if unused
    evictionPolicy: 'lru', // Least Recently Used
    preWarmOnStartup: true, // Load model immediately
    enableModelVersionPinning: true, // Don't auto-upgrade
  },

  // GPU memory budget
  gpu: {
    maxMemoryMB: 8_192, // Total budget for this model
    perRequestReserveMB: 512, // Reserved per concurrent request
    oomRecoveryThresholdMB: 1_024, // Trigger eviction if free < this
    gpuDeviceId: 0, // Which GPU to use (if multi-GPU)
  },

  // Concurrency & timeouts
  concurrency: {
    maxQueueDepth: 32, // Tasks waiting for GPU slot
    requestTimeoutMs: 120_000, // 2 min per extraction
    healthCheckIntervalMs: 30_000, // Every 30 sec
    healthCheckTimeoutMs: 5_000, // 5 sec for health check itself
  },

  // Performance & cost
  performance: {
    enableStreamingExtraction: true, // Yield tokens as they arrive
    enableBatchingSmallFiles: true, // Combine small images
    batchSizeMaxImages: 8, // Up to 8 small images per batch
    batchSizeMaxMemoryMB: 2_048, // Stop batching if > 2GB needed
  },

  // Monitoring & observability
  monitoring: {
    emitLatencyHistogram: true, // For performance tracking
    emitGpuMemoryGauge: true, // GPU usage over time
    emitQueueDepthGauge: true, // Queue backlog
    logSlowExtractions: true, // Log if > 60 sec
    slowExtractionThresholdMs: 60_000,
  },

  // Fallback & reliability
  fallback: {
    enableHybridMode: true, // Local → remote fallback
    remoteTimeoutMs: 90_000, // Fallback request timeout
    remoteRetryCount: 2,
    remoteRetryBackoffMs: 1_000, // Exponential backoff
  },
};
```

### Initialization in Pipeline

```typescript
// src/cic/runtime/pipeline/pipelineInit.ts

import { WarmPoolManager } from '../warmPool/WarmPoolManager';
import { imageAnalyzerV2Config } from '../../config/analyzers/imageAnalyzerV2.config';
import { imageAnalyzerV2 } from '../../analyzers/image/v2/imageAnalyzerV2Adapter';

export function initializeImageAnalyzerV2Warmpool(): void {
  const { modelId, warmPool: wpConfig, gpu } = imageAnalyzerV2Config;

  const pool = WarmPoolManager.forModel(modelId);

  // Apply warm-pool tuning
  pool.setMaxConcurrent(wpConfig.maxConcurrentRequests);
  pool.setIdleTimeout(wpConfig.idleTimeoutMs);
  pool.setEvictionPolicy(wpConfig.evictionPolicy);

  // Pre-warm model if configured
  if (wpConfig.preWarmOnStartup) {
    pool.acquireModel()
      .then(model => {
        logger.info(`[ImageAnalyzerV2] Model pre-warmed: ${model.name} v${model.version}`);
        return pool.releaseModel(model);
      })
      .catch(err => {
        logger.warn(`[ImageAnalyzerV2] Pre-warm failed: ${err.message}`);
      });
  }

  logger.info(
    `[ImageAnalyzerV2] Warm-pool initialized: max_concurrent=${wpConfig.maxConcurrentRequests}, ` +
    `gpu_budget=${gpu.maxMemoryMB}MB, idle_timeout=${wpConfig.idleTimeoutMs}ms`
  );
}

// Call during CIC pipeline startup
initializeImageAnalyzerV2Warmpool();
```

---

## Part 2: GPU Memory Budget Allocation

### Memory Breakdown (Example: 16 GB GPU)

```
Total GPU Memory:     16,384 MB
├── OS/CUDA Runtime:  1,024 MB (reserved)
├── Model Weights:    8,192 MB (LLaVA 1.5 int8)
├── Activation Buffer: 4,096 MB (KV cache, intermediate tensors)
├── Per-Request Reserve: 2,048 MB (512 MB × 4 concurrent)
└── Headroom:          880 MB (safety margin for kernel launches)

Allocatable to ImageAnalyzerV2: 8,192 MB
```

### Memory Profile per Model

| Model | Quantization | Weights | Activation | Typical Load % |
|-------|--------------|---------|------------|----------------|
| LLaVA 1.5 | FP16 | 14 GB | 6 GB | 95% on 16GB |
| LLaVA 1.5 | INT8 | 8 GB | 3 GB | 70% on 16GB |
| MiniCPM-V | FP16 | 8 GB | 4 GB | 75% on 16GB |
| MiniCPM-V | INT8 | 4 GB | 2 GB | 37% on 16GB |
| InternVL | FP16 | 24 GB | 8 GB | 200% on 16GB (swap) |

**Recommendation:** Use INT8 quantization for models > 6GB to avoid swap thrashing.

### Dynamic Memory Allocation

```typescript
// src/cic/runtime/warmPool/gpuMemoryAllocator.ts

interface MemoryBudget {
  totalMB: number;
  modelWeightsMB: number;
  activationBufferMB: number;
  perRequestReserveMB: number;
  oomRecoveryThresholdMB: number;
}

export class GPUMemoryAllocator {
  private totalFreeMB: number;
  private allocated: Map<string, number> = new Map();

  constructor(private budget: MemoryBudget) {
    this.totalFreeMB = budget.totalMB;
  }

  /**
   * Check if we can safely allocate for a new request.
   * If not, trigger OOM recovery (evict unused models).
   */
  async canAllocate(modelId: string, requestBytes: number): Promise<boolean> {
    const requestMB = Math.ceil(requestBytes / 1024 / 1024);

    // Check if we have budget
    if (this.totalFreeMB < requestMB + this.budget.oomRecoveryThresholdMB) {
      // Trigger eviction
      await this.evictUnusedModels();
    }

    return this.totalFreeMB >= requestMB + this.budget.oomRecoveryThresholdMB;
  }

  private async evictUnusedModels(): Promise<void> {
    // Implementation: unload models with longest idle time
    logger.info('[GPUMemoryAllocator] OOM recovery: evicting unused models');
  }

  recordAllocation(modelId: string, sizeMB: number): void {
    const current = this.allocated.get(modelId) ?? 0;
    this.allocated.set(modelId, current + sizeMB);
    this.totalFreeMB -= sizeMB;
  }

  recordDeallocation(modelId: string, sizeMB: number): void {
    const current = this.allocated.get(modelId) ?? 0;
    this.allocated.set(modelId, Math.max(0, current - sizeMB));
    this.totalFreeMB += sizeMB;
  }

  getStatus(): {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    utilizationPercent: number;
  } {
    const usedMB = this.budget.totalMB - this.totalFreeMB;
    return {
      totalMB: this.budget.totalMB,
      usedMB,
      freeMB: this.totalFreeMB,
      utilizationPercent: (usedMB / this.budget.totalMB) * 100,
    };
  }
}
```

### Memory Tuning Per-Environment

```typescript
// Development (8 GB GPU)
export const devGpuBudget: MemoryBudget = {
  totalMB: 8_192,
  modelWeightsMB: 4_096, // INT8 MiniCPM-V only
  activationBufferMB: 2_048,
  perRequestReserveMB: 256,
  oomRecoveryThresholdMB: 512,
};

// Staging (16 GB GPU)
export const stagingGpuBudget: MemoryBudget = {
  totalMB: 16_384,
  modelWeightsMB: 8_192, // INT8 LLaVA 1.5
  activationBufferMB: 4_096,
  perRequestReserveMB: 512,
  oomRecoveryThresholdMB: 1_024,
};

// Production (32 GB GPU, multi-model)
export const prodGpuBudget: MemoryBudget = {
  totalMB: 32_768,
  modelWeightsMB: 16_384, // FP16 LLaVA 1.5 + InternVL
  activationBufferMB: 8_192,
  perRequestReserveMB: 1_024,
  oomRecoveryThresholdMB: 2_048,
};
```

---

## Part 3: Model Lifecycle Hooks

### Hook Points

```typescript
// src/cic/runtime/warmPool/modelLifecycle.ts

export enum ModelLifecycleEvent {
  LOAD_START = 'load_start',
  LOAD_COMPLETE = 'load_complete',
  LOAD_FAILED = 'load_failed',
  UNLOAD_START = 'unload_start',
  UNLOAD_COMPLETE = 'unload_complete',
  HEALTH_CHECK_PASS = 'health_check_pass',
  HEALTH_CHECK_FAIL = 'health_check_fail',
  OOM_RECOVERY_START = 'oom_recovery_start',
  OOM_RECOVERY_COMPLETE = 'oom_recovery_complete',
}

export interface ModelLifecycleHook {
  modelId: string;
  onEvent(event: ModelLifecycleEvent, data: any): Promise<void>;
}

export class ModelLifecycleManager {
  private hooks: ModelLifecycleHook[] = [];

  registerHook(hook: ModelLifecycleHook): void {
    this.hooks.push(hook);
  }

  async emit(modelId: string, event: ModelLifecycleEvent, data: any): Promise<void> {
    const relevantHooks = this.hooks.filter(h => h.modelId === modelId || h.modelId === '*');
    await Promise.all(relevantHooks.map(h => h.onEvent(event, data)));
  }
}
```

### Example Hooks for ImageAnalyzerV2

```typescript
// src/cic/analyzers/image/v2/hooks/imageAnalyzerLifecycleHooks.ts

import { ModelLifecycleEvent, ModelLifecycleHook } from '../../../runtime/warmPool/modelLifecycle';
import { logger } from '../../../logging';

/**
 * Hook 1: Telemetry and logging
 */
export const telemetryHook: ModelLifecycleHook = {
  modelId: 'image_analyzer_v2',
  async onEvent(event: ModelLifecycleEvent, data: any) {
    logger.info(`[ImageAnalyzerV2] ${event}`, {
      timestamp: new Date().toISOString(),
      event,
      data,
    });

    // Emit Prometheus metrics
    if (event === ModelLifecycleEvent.LOAD_COMPLETE) {
      metrics.imageAnalyzerLoadTimeMs.observe(data.durationMs);
    }
    if (event === ModelLifecycleEvent.HEALTH_CHECK_FAIL) {
      metrics.imageAnalyzerHealthCheckFailures.inc();
    }
  },
};

/**
 * Hook 2: GPU memory tracking
 */
export const gpuMemoryHook: ModelLifecycleHook = {
  modelId: 'image_analyzer_v2',
  async onEvent(event: ModelLifecycleEvent, data: any) {
    switch (event) {
      case ModelLifecycleEvent.LOAD_COMPLETE:
        gpuMemoryAllocator.recordAllocation('image_analyzer_v2', data.gpuMemoryMB);
        break;

      case ModelLifecycleEvent.UNLOAD_COMPLETE:
        gpuMemoryAllocator.recordDeallocation('image_analyzer_v2', data.gpuMemoryMB);
        break;

      case ModelLifecycleEvent.OOM_RECOVERY_START:
        logger.warn(`[ImageAnalyzerV2] OOM recovery triggered`, {
          gpuStatus: data.gpuStatus,
        });
        break;
    }
  },
};

/**
 * Hook 3: Warm-up and cache warming
 */
export const warmUpHook: ModelLifecycleHook = {
  modelId: 'image_analyzer_v2',
  async onEvent(event: ModelLifecycleEvent, data: any) {
    if (event === ModelLifecycleEvent.LOAD_COMPLETE) {
      // Run a warm-up extraction to cache KV states
      logger.info(`[ImageAnalyzerV2] Running warm-up extraction`);

      try {
        const model = data.model;
        const warmupPath = '/cic/config/warmup-image.jpg'; // Pre-created test image

        const stream = await model.analyzeImageStreaming(warmupPath);
        for await (const chunk of stream) {
          // Consume all chunks to populate KV cache
        }

        logger.info(`[ImageAnalyzerV2] Warm-up complete`);
      } catch (err) {
        logger.warn(`[ImageAnalyzerV2] Warm-up failed: ${err.message}`);
      }
    }
  },
};

/**
 * Hook 4: Version pinning (prevent accidental upgrades)
 */
export const versionPinningHook: ModelLifecycleHook = {
  modelId: 'image_analyzer_v2',
  async onEvent(event: ModelLifecycleEvent, data: any) {
    if (event === ModelLifecycleEvent.LOAD_COMPLETE) {
      const expectedVersion = '1.5.0'; // Pinned version
      const actualVersion = data.model.version;

      if (actualVersion !== expectedVersion) {
        logger.error(`[ImageAnalyzerV2] Version mismatch detected`, {
          expected: expectedVersion,
          actual: actualVersion,
        });

        // Reject the load or log incident
        throw new Error(
          `Version mismatch: expected ${expectedVersion}, got ${actualVersion}`
        );
      }
    }
  },
};

// Register all hooks
export function registerImageAnalyzerV2Hooks(
  lifecycleManager: ModelLifecycleManager
): void {
  lifecycleManager.registerHook(telemetryHook);
  lifecycleManager.registerHook(gpuMemoryHook);
  lifecycleManager.registerHook(warmUpHook);
  lifecycleManager.registerHook(versionPinningHook);
}
```

---

## Part 4: Concurrency Tuning

### Queue Dynamics

```
Incoming requests → Queue (max_depth=32)
                      ↓
                   GPU Slot (max_concurrent=4)
                      ↓
                   Model.extractStreaming()
                      ↓
                   Result + release GPU slot
                      ↓
                   Return to client
```

### Recommended Concurrency Settings

```typescript
// Per GPU config
imageAnalyzerV2Config.concurrency = {
  maxQueueDepth: 32,           // Up to 32 waiting requests
  requestTimeoutMs: 120_000,   // 2 min per extraction
  healthCheckIntervalMs: 30_000,
  healthCheckTimeoutMs: 5_000,
};

// With 4 concurrent slots:
// - Small files (< 1 MB): ~500 ms each → 8 files/sec capacity
// - Medium files (1-10 MB): ~2 sec each → 2 files/sec capacity
// - Large files (10+ MB, hybrid fallback): ~5 sec each → 0.8 files/sec

// Queue will accumulate if arrival rate > capacity
```

### Adaptive Concurrency

```typescript
// src/cic/runtime/warmPool/adaptiveConcurrency.ts

export class AdaptiveConcurrencyManager {
  private baseMaxConcurrent: number;
  private targetP99LatencyMs: number = 10_000; // 10 sec target

  constructor(initialMaxConcurrent: number) {
    this.baseMaxConcurrent = initialMaxConcurrent;
  }

  /**
   * Adjust max concurrency based on recent P99 latency.
   * If P99 > target, decrease concurrency. If P99 << target, increase.
   */
  adjustConcurrency(p99LatencyMs: number): number {
    if (p99LatencyMs > this.targetP99LatencyMs * 1.1) {
      // P99 too high, reduce concurrency
      return Math.max(1, this.baseMaxConcurrent - 1);
    }

    if (p99LatencyMs < this.targetP99LatencyMs * 0.5) {
      // P99 healthy, try increasing
      return this.baseMaxConcurrent + 1;
    }

    return this.baseMaxConcurrent;
  }
}
```

---

## Part 5: OOM Recovery Procedure

### Detection & Recovery Flow

```
GPU Memory Free < OOM_RECOVERY_THRESHOLD
    ↓
Trigger OOM Recovery Event
    ↓
1. Pause new acquireModel() calls (1-2 sec)
2. Wait for in-flight extractions to complete
3. Rank models by LRU (Least Recently Used)
4. Unload LRU models until Memory Free > threshold
5. Resume acquireModel() calls
6. Emit OOM_RECOVERY_COMPLETE event
```

### Implementation

```typescript
// src/cic/runtime/warmPool/oomRecovery.ts

export class OOMRecoveryManager {
  private isRecovering = false;
  private recoveryStartTime = 0;
  private maxRecoveryDurationMs = 30_000; // 30 sec timeout

  async triggerRecovery(
    pool: WarmPoolManager,
    allocator: GPUMemoryAllocator
  ): Promise<void> {
    if (this.isRecovering) {
      logger.warn('[OOMRecoveryManager] Recovery already in progress, skipping');
      return;
    }

    this.isRecovering = true;
    this.recoveryStartTime = Date.now();

    try {
      logger.warn('[OOMRecoveryManager] OOM recovery started');

      // Pause new requests
      pool.pauseNewAcquisitions();

      // Wait for in-flight requests (timeout after 30 sec)
      const inFlightWaitStarted = Date.now();
      while (pool.getInFlightCount() > 0) {
        if (Date.now() - inFlightWaitStarted > 15_000) {
          logger.warn('[OOMRecoveryManager] In-flight wait timeout, forcing unload');
          break;
        }
        await sleep(100);
      }

      // Unload LRU models
      const status = await pool.getStatus();
      const memoryStatus = allocator.getStatus();

      while (memoryStatus.freeMB < allocator.budget.oomRecoveryThresholdMB) {
        const lruModel = await pool.getAndRemoveLRUModel();
        if (!lruModel) break; // No more models to evict

        logger.info(`[OOMRecoveryManager] Unloading ${lruModel.id}`);
        allocator.recordDeallocation(lruModel.id, lruModel.gpuMemoryMB);
      }

      // Resume
      pool.resumeNewAcquisitions();

      logger.info(
        `[OOMRecoveryManager] OOM recovery complete (${Date.now() - this.recoveryStartTime}ms)`
      );
    } finally {
      this.isRecovering = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### OOM-Aware Adapter

The `localImageExtractor.ts` already handles OOM signals:

```typescript
// From localImageExtractor.ts
catch (e) {
  // Check if this is an OOM error
  if (errMsg.includes('OOM') || errMsg.includes('memory')) {
    try {
      await this.warmPool.signalOOMRecovery();
    } catch {
      // Warn but don't rethrow
    }
  }
  throw e;
}
```

---

## Part 6: Monitoring & Observability

### Key Metrics to Track

```typescript
// src/cic/analyzers/image/v2/metrics.ts

import { register, Histogram, Gauge, Counter } from 'prom-client';

export const imageAnalyzerMetrics = {
  // Latency histogram (per backend)
  extractionLatencyMs: new Histogram({
    name: 'cic_image_analyzer_extraction_latency_ms',
    help: 'Extraction latency by backend',
    labelNames: ['backend'], // 'local', 'remote', 'hybrid'
    buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
  }),

  // GPU memory gauge
  gpuMemoryUsageMB: new Gauge({
    name: 'cic_image_analyzer_gpu_memory_mb',
    help: 'Current GPU memory usage',
    labelNames: ['model'],
  }),

  // Queue depth gauge
  queueDepth: new Gauge({
    name: 'cic_image_analyzer_queue_depth',
    help: 'Number of waiting extraction requests',
  }),

  // Extraction success/failure counter
  extractionResult: new Counter({
    name: 'cic_image_analyzer_extractions_total',
    help: 'Total extractions by result',
    labelNames: ['backend', 'result'], // result: 'success', 'oom_error', 'timeout', 'api_error'
  }),

  // OOM recoveries
  oomRecoveries: new Counter({
    name: 'cic_image_analyzer_oom_recoveries_total',
    help: 'Number of OOM recovery events triggered',
  }),

  // Model load/unload time
  modelLoadTimeMs: new Histogram({
    name: 'cic_image_analyzer_model_load_time_ms',
    help: 'Model load duration',
    buckets: [500, 1000, 2000, 5000, 10000, 30000],
  }),

  // Health check failures
  healthCheckFailures: new Counter({
    name: 'cic_image_analyzer_health_check_failures_total',
    help: 'Health check failures by backend',
    labelNames: ['backend'],
  }),
};

register.registerMetric(imageAnalyzerMetrics.extractionLatencyMs);
register.registerMetric(imageAnalyzerMetrics.gpuMemoryUsageMB);
register.registerMetric(imageAnalyzerMetrics.queueDepth);
register.registerMetric(imageAnalyzerMetrics.extractionResult);
register.registerMetric(imageAnalyzerMetrics.oomRecoveries);
register.registerMetric(imageAnalyzerMetrics.modelLoadTimeMs);
register.registerMetric(imageAnalyzerMetrics.healthCheckFailures);
```

### Alerting Rules

```yaml
# alerts.yaml
groups:
  - name: image_analyzer_v2
    rules:
      - alert: ImageAnalyzerHighLatencyP99
        expr: histogram_quantile(0.99, cic_image_analyzer_extraction_latency_ms) > 10000
        for: 5m
        annotations:
          summary: "ImageAnalyzer P99 latency > 10s"

      - alert: ImageAnalyzerQueueBacklog
        expr: cic_image_analyzer_queue_depth > 16
        for: 2m
        annotations:
          summary: "ImageAnalyzer queue backlog building"

      - alert: ImageAnalyzerGPUMemoryAlmostFull
        expr: cic_image_analyzer_gpu_memory_mb > 7500 # 92% of 8GB
        for: 1m
        annotations:
          summary: "GPU memory utilization critical"

      - alert: ImageAnalyzerOOMRecoveryFrequent
        expr: rate(cic_image_analyzer_oom_recoveries_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "OOM recovery happening > 0.1/sec"

      - alert: ImageAnalyzerHealthCheckFailing
        expr: rate(cic_image_analyzer_health_check_failures_total[5m]) > 0
        for: 1m
        annotations:
          summary: "ImageAnalyzer health checks failing"
```

---

## Part 7: Performance Tuning Checklist

### Pre-Production Validation

- [ ] **Model selection** — INT8 quantization for models ≥ 6GB
- [ ] **GPU budget verified** — `(modelWeightsMB + activationBufferMB + perRequestReserveMB * maxConcurrent) < totalMB`
- [ ] **Concurrency tuned** — Load tested at peak throughput; P99 latency < 10 sec
- [ ] **OOM recovery tested** — Trigger artificial OOM; verify recovery within 30 sec
- [ ] **Warm-pool pre-warm** — Model loads on startup; zero cold-start latencies
- [ ] **Lifecycle hooks registered** — Telemetry, GPU tracking, version pinning active
- [ ] **Metrics dashboards live** — Queue depth, latency histogram, GPU memory visible
- [ ] **Alerting rules active** — Pagerduty/Slack integration for critical alerts

### Production Rollout

1. **Canary (5% traffic)** — Monitor for 24 hours
2. **Ramp (25% traffic)** — Verify P99 latency stable
3. **Full rollout** — Once confidence high
4. **Monitor first week** — Check for memory leaks, drift in confidence, unexpected fallbacks

---

## Summary Table: Tuning by Environment

| Dimension | Dev (8GB) | Staging (16GB) | Prod (32GB) |
|-----------|-----------|----------------|------------|
| Model | MiniCPM-V INT8 | LLaVA 1.5 INT8 | LLaVA 1.5 FP16 + InternVL |
| Max Concurrent | 2 | 4 | 8 |
| Queue Depth | 16 | 32 | 64 |
| Idle Timeout | 10 min | 5 min | 2 min |
| P99 Latency Target | 8 sec | 5 sec | 3 sec |
| Pre-warm | No | Yes | Yes |
| Cost Budgeting | N/A | Optional | Required |

---

## References

- [WarmPoolManager Design](./WARMPOOL_MANAGER_DESIGN.md) (generate if needed)
- [GPU Memory Debugging](./GPU_MEMORY_DEBUG.md) (generate if needed)
- [Confidence Calibration](./CONFIDENCE_CALIBRATION.md) (next artifact, if requested)

---

**End of Phase 28 Warm-Pool Tuning Guide**

Questions? Check the inline code comments or refer to CIC_CONTEXT for architecture details.
