// imageAnalyzerV2RoutingPolicy.ts
// Backend routing policy for image analyzer (local, remote, hybrid)
// Deterministic decision logic: local-preferred when healthy, remote fallback, hybrid for large/concurrent workloads

import type { FileRecord } from '../../types/fileRecord.js';

export type BackendKind = 'local' | 'remote' | 'hybrid';

export interface RoutingContext {
  file: FileRecord;
  localHealthy: boolean;
  remoteHealthy: boolean;
}

export interface RoutingDecision {
  backend: BackendKind;
  reason: string;
}

/**
 * Routing decision logic.
 *
 * Policy:
 * 1. Both healthy + small file → local (lowest latency, no API cost)
 * 2. Both healthy + large file (>10MB) → hybrid (load distribution)
 * 3. Local healthy + remote unhealthy → local only
 * 4. Remote healthy + local unhealthy → remote only
 * 5. Both unhealthy → remote as last resort (or throw in strict mode)
 *
 * Future enhancements:
 * - Cost budget (prefer local if cost_remaining < threshold)
 * - Concurrency pressure (prefer remote if queue_depth > N)
 * - Time-of-day (prefer local during peak hours)
 * - Model version/capability matching
 */
export async function getRoutingDecision(
  ctx: RoutingContext
): Promise<RoutingDecision> {
  const { file, localHealthy, remoteHealthy } = ctx;

  // Both backends healthy: choose based on file size and concurrency
  if (localHealthy && remoteHealthy) {
    // Large files: use hybrid to avoid GPU OOM on local
    if (file.sizeBytes && file.sizeBytes > 10 * 1024 * 1024) {
      return {
        backend: 'hybrid',
        reason: `both healthy, large file (${(file.sizeBytes / 1024 / 1024).toFixed(1)}MB) → hybrid routing`,
      };
    }

    // Small files: prefer local (fast, no cost)
    return {
      backend: 'local',
      reason: 'both healthy, local-preferred (small file, no API cost)',
    };
  }

  // Local healthy, remote unhealthy
  if (localHealthy && !remoteHealthy) {
    return {
      backend: 'local',
      reason: 'remote unhealthy, local only',
    };
  }

  // Remote healthy, local unhealthy
  if (!localHealthy && remoteHealthy) {
    return {
      backend: 'remote',
      reason: 'local unhealthy, remote only',
    };
  }

  // Both unhealthy: return remote as fallback (will error in analyze() if both truly fail)
  return {
    backend: 'remote',
    reason: 'both reported unhealthy, attempting remote fallback',
  };
}

/**
 * Example: Cost-aware routing (future enhancement).
 * If cost budget is low, prefer local even if remote would be faster.
 */
export interface CostAwareContext extends RoutingContext {
  remainingBudgetUSD?: number;
  costPerRemoteCall?: number;
}

export async function getRoutingDecisionCostAware(
  ctx: CostAwareContext
): Promise<RoutingDecision> {
  const baseDecision = await getRoutingDecision(ctx);

  // If cost budget is low, override to local
  if (
    ctx.remainingBudgetUSD &&
    ctx.costPerRemoteCall &&
    ctx.remainingBudgetUSD < ctx.costPerRemoteCall
  ) {
    if (ctx.localHealthy) {
      return {
        backend: 'local',
        reason: `cost budget low ($${ctx.remainingBudgetUSD.toFixed(2)} remaining), forcing local`,
      };
    }
  }

  return baseDecision;
}
