import { ModelPerformance } from "./evaluator";
import { CostEntry } from "../../costs/models";
import { TASK_CONFIG, DEFAULT_CONSTRAINTS } from "../policy";

export interface OptimizedPolicy {
  taskType: "rewrite" | "analysis" | "generation" | "chat";
  preferredOrder: string[];
  qualityTarget: number;
  maxCostUsd: number;
  fallbackAggressiveness: number;
  localPreference: number;
  providerWeights: Record<string, number>;
}

interface SimulatedResult {
  avgQuality: number;
  avgCost: number;
  fallbackRate: number;
  violationRate: number; // cost > maxCostUsd
}

// Replays historical logs on a policy candidate to simulate performance
function simulatePolicy(
  policy: OptimizedPolicy,
  logs: CostEntry[],
  performanceMap: Record<string, ModelPerformance>
): SimulatedResult {
  if (logs.length === 0) {
    return { avgQuality: 8.0, avgCost: 0, fallbackRate: 0, violationRate: 0 };
  }

  let totalQuality = 0;
  let totalCost = 0;
  let fallbacks = 0;
  let violations = 0;

  for (const log of logs) {
    // Select the best model according to policy
    let chosenModel = policy.preferredOrder[0];
    let found = false;

    // Apply provider weight and preference adjustments
    const scoredCandidates = policy.preferredOrder.map((modelName) => {
      const perf = performanceMap[modelName];
      if (!perf) return { modelName, score: 0, cost: 0.1, quality: 6.0 };

      const providerWeight = policy.providerWeights[perf.provider] ?? 1.0;
      let score = perf.score * providerWeight;

      // Adjust for local preference
      if (perf.provider === "ollama" && policy.localPreference > 0) {
        score += policy.localPreference * 5.0; // Boost local models
      }

      return {
        modelName,
        score,
        cost: perf.avgCost > 0 ? perf.avgCost : 0.001,
        quality: perf.avgQuality,
      };
    });

    // Sort by weighted policy score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick the first candidate that satisfies the maxCostUsd cap, otherwise fallback
    for (let i = 0; i < scoredCandidates.length; i++) {
      const candidate = scoredCandidates[i];
      if (candidate.cost <= policy.maxCostUsd || i === scoredCandidates.length - 1) {
        chosenModel = candidate.modelName;
        if (candidate.cost > policy.maxCostUsd) {
          violations++;
        }
        if (chosenModel !== policy.preferredOrder[0]) {
          fallbacks++;
        }
        found = true;
        break;
      }
    }

    const finalModelPerf = performanceMap[chosenModel];
    if (finalModelPerf) {
      totalQuality += finalModelPerf.avgQuality;
      totalCost += finalModelPerf.avgCost;
    } else {
      totalQuality += 7.0; // fallback default
    }
  }

  return {
    avgQuality: totalQuality / logs.length,
    avgCost: totalCost / logs.length,
    fallbackRate: fallbacks / logs.length,
    violationRate: violations / logs.length,
  };
}

// Computes a fitness score: maximize quality, minimize cost and fallbacks
function computeFitness(sim: SimulatedResult, targetQuality: number): number {
  let score = sim.avgQuality * 10.0; // Positive reinforcement for quality
  
  // High penalty if quality falls below targeted value
  if (sim.avgQuality < targetQuality) {
    score -= (targetQuality - sim.avgQuality) * 30.0;
  }

  score -= sim.avgCost * 300.0; // Heavy penalty for cost
  score -= sim.fallbackRate * 2.0; // Small penalty for fallback events
  score -= sim.violationRate * 15.0; // Heavy penalty for exceeding caps

  return score;
}

export function optimizePolicy(
  taskType: "rewrite" | "analysis" | "generation" | "chat",
  performances: ModelPerformance[],
  logs: CostEntry[]
): OptimizedPolicy {
  // Map models for fast lookup
  const performanceMap: Record<string, ModelPerformance> = {};
  for (const perf of performances) {
    performanceMap[perf.model] = perf;
  }

  // Filter logs for this specific task type
  const taskLogs = logs.filter((log) => (log.metadata?.taskType || "unknown") === taskType);

  // Initialize base policy
  const defaultCandidates = TASK_CONFIG[taskType]?.candidates || [];
  const basePreferredOrder = performances.map((p) => p.model);

  const currentPolicy: OptimizedPolicy = {
    taskType,
    preferredOrder: [...basePreferredOrder],
    qualityTarget: taskType === "rewrite" || taskType === "analysis" ? 8.0 : 7.0,
    maxCostUsd: DEFAULT_CONSTRAINTS.maxCostPerRequestUsd,
    fallbackAggressiveness: 0.5,
    localPreference: 0.2,
    providerWeights: {
      anthropic: 1.0,
      google: 1.0,
      microsoft: 1.0,
      ollama: 1.0,
    },
  };

  let bestPolicy = { ...currentPolicy };
  let bestFitness = computeFitness(
    simulatePolicy(bestPolicy, taskLogs, performanceMap),
    bestPolicy.qualityTarget
  );

  // Hill climbing optimization parameters
  const ITERATIONS = 150;
  const STEP_SIZE = 0.1;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Create mutation candidate
    const candidate: OptimizedPolicy = JSON.parse(JSON.stringify(bestPolicy));

    // Mutate parameters randomly
    const mutationType = Math.random();

    if (mutationType < 0.2) {
      // 1. Mutate quality target slightly
      const delta = (Math.random() - 0.5) * STEP_SIZE * 5.0;
      candidate.qualityTarget = Math.max(5.0, Math.min(10.0, candidate.qualityTarget + delta));
    } else if (mutationType < 0.4) {
      // 2. Mutate max cost per request cap
      const delta = (Math.random() - 0.5) * STEP_SIZE * 0.5;
      candidate.maxCostUsd = Math.max(0.01, Math.min(1.0, candidate.maxCostUsd + delta));
    } else if (mutationType < 0.6) {
      // 3. Mutate fallback and local preference
      candidate.fallbackAggressiveness = Math.max(
        0.0,
        Math.min(1.0, candidate.fallbackAggressiveness + (Math.random() - 0.5) * STEP_SIZE)
      );
      candidate.localPreference = Math.max(
        0.0,
        Math.min(1.0, candidate.localPreference + (Math.random() - 0.5) * STEP_SIZE)
      );
    } else if (mutationType < 0.8) {
      // 4. Mutate provider weights
      const providers = Object.keys(candidate.providerWeights);
      const chosenProvider = providers[Math.floor(Math.random() * providers.length)];
      const delta = (Math.random() - 0.5) * STEP_SIZE * 2.0;
      candidate.providerWeights[chosenProvider] = Math.max(
        0.1,
        Math.min(2.0, candidate.providerWeights[chosenProvider] + delta)
      );
    } else {
      // 5. Permute preferredOrder list (swap two elements)
      if (candidate.preferredOrder.length > 1) {
        const i = Math.floor(Math.random() * candidate.preferredOrder.length);
        let j = Math.floor(Math.random() * candidate.preferredOrder.length);
        while (i === j) {
          j = Math.floor(Math.random() * candidate.preferredOrder.length);
        }
        const temp = candidate.preferredOrder[i];
        candidate.preferredOrder[i] = candidate.preferredOrder[j];
        candidate.preferredOrder[j] = temp;
      }
    }

    // Evaluate mutation candidate
    const sim = simulatePolicy(candidate, taskLogs, performanceMap);
    const fitness = computeFitness(sim, candidate.qualityTarget);

    // If candidate has better fitness, accept it as the new best
    if (fitness > bestFitness) {
      bestPolicy = candidate;
      bestFitness = fitness;
    }
  }

  return bestPolicy;
}
