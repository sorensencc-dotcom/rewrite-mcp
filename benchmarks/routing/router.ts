import {
  RoutingContext,
  RoutingDecision,
  ModelOption,
  TASK_CONFIG,
  DEFAULT_CONSTRAINTS,
} from "./policy";
import { PROVIDER_PRICING, estimateDirectCostUsd } from "../costs/models";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface TodaySummary {
  totalRealUsd: number;
  totalImpliedUsd: number;
  byProvider: Record<string, { realUsd: number; impliedUsd: number }>;
}

export async function selectModel(
  ctx: RoutingContext
): Promise<RoutingDecision> {
  const taskConfig = TASK_CONFIG[ctx.taskType];
  if (!taskConfig) {
    throw new Error(`Unknown task type: ${ctx.taskType}`);
  }

  const costSummary = readTodaySummary();
  const candidates = taskConfig.candidates;

  // Score each candidate
  const scored = candidates.map((candidate) => {
    const cost = estimateCostForCandidate(
      candidate,
      taskConfig.estimatedInputTokens,
      taskConfig.estimatedOutputTokens
    );

    const penalty = computeBudgetPenalty(
      costSummary,
      cost,
      ctx,
      taskConfig.estimatedInputTokens + taskConfig.estimatedOutputTokens
    );

    const score = candidate.estimatedQuality - penalty;

    return {
      candidate,
      cost,
      penalty,
      score,
    };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1).map((s) => s.candidate);

  // Build reason
  const reason =
    `quality=${best.candidate.estimatedQuality.toFixed(1)} ` +
    `penalty=${best.penalty.toFixed(2)} ` +
    `score=${best.score.toFixed(2)} ` +
    `cost=$${best.cost.toFixed(4)}`;

  return {
    chosen: best.candidate,
    alternatives,
    reason,
    costEstimateUsd: best.cost,
  };
}

function estimateCostForCandidate(
  candidate: ModelOption,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  if (candidate.provider === "ollama") {
    // For Ollama, estimate as local compute (effectively free, but track cloud equivalent)
    // Return 0 for now; can be augmented with energy cost estimation
    return 0;
  }

  const pricing = PROVIDER_PRICING[candidate.provider];
  if (!pricing) {
    return 0;
  }

  const modelPricing =
    pricing[candidate.model as keyof typeof pricing];
  if (!modelPricing) {
    return 0;
  }

  // Use Phase 48's cost calculation
  return estimateDirectCostUsd(
    candidate.provider,
    candidate.model,
    estimatedInputTokens,
    estimatedOutputTokens
  );
}

function computeBudgetPenalty(
  summary: TodaySummary,
  requestCost: number,
  ctx: RoutingContext,
  totalTokens: number
): number {
  let penalty = 0;

  const dailyBudget = ctx.dailyBudgetUsd ?? DEFAULT_CONSTRAINTS.dailyBudgetUsd;
  const maxPerRequest =
    ctx.maxCostUsd ?? DEFAULT_CONSTRAINTS.maxCostPerRequestUsd;

  // Per-request budget exceeded
  if (requestCost > maxPerRequest) {
    penalty += 2.0; // Hard penalty
  }

  // Daily budget approach/exceeded
  const currentSpend = summary.totalRealUsd;
  const remainingBudget = dailyBudget - currentSpend;

  if (remainingBudget < 0) {
    // Over budget: penalize proportionally
    penalty += Math.min(5.0, Math.abs(remainingBudget) / dailyBudget * 3);
  } else if (remainingBudget < requestCost) {
    // Would exceed budget
    penalty += 1.5;
  } else if (remainingBudget < dailyBudget * 0.2) {
    // Only 20% of budget left: increase penalty to encourage cheaper models
    penalty += 0.5;
  }

  return penalty;
}

function readTodaySummary(): TodaySummary {
  const helmPath = join(
    process.cwd(),
    "benchmarks",
    "costs",
    "reports",
    "helm.json"
  );

  if (!existsSync(helmPath)) {
    // No cost data yet; return empty summary
    return {
      totalRealUsd: 0,
      totalImpliedUsd: 0,
      byProvider: {},
    };
  }

  try {
    const data = readFileSync(helmPath, "utf8");
    const helm = JSON.parse(data);
    return helm.today || { totalRealUsd: 0, totalImpliedUsd: 0, byProvider: {} };
  } catch {
    return {
      totalRealUsd: 0,
      totalImpliedUsd: 0,
      byProvider: {},
    };
  }
}
