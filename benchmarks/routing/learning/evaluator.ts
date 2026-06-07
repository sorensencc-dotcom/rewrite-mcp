import { ExtractedFeatures } from "./features";
import { CostEntry } from "../../costs/models";
import { TASK_CONFIG } from "../policy";

export interface ModelPerformance {
  model: string;
  provider: string;
  score: number; // weighted score
  costPerQuality: number;
  reliability: number;
  avgLatency: number;
  avgCost: number;
  avgQuality: number;
}

export interface EvaluatorWeights {
  wQ: number; // Quality weight
  wC: number; // Cost weight
  wR: number; // Reliability weight
}

export const DEFAULT_WEIGHTS: EvaluatorWeights = {
  wQ: 4.0,   // Quality is heavily valued
  wC: 100.0, // Penalize high cost (since cost is small, e.g., $0.05 * 100 = -5.0 points)
  wR: 5.0,   // Reward high reliability (success rate)
};

// Map provider to default latency if no data exists
const PROVIDER_LATENCIES: Record<string, number> = {
  anthropic: 2500,
  google: 1800,
  microsoft: 2000,
  ollama: 800,
  unknown: 2000,
};

export function evaluateModels(
  features: ExtractedFeatures,
  logs: CostEntry[],
  weights: EvaluatorWeights = DEFAULT_WEIGHTS
): Record<string, ModelPerformance[]> {
  const evaluations: Record<string, ModelPerformance[]> = {
    rewrite: [],
    analysis: [],
    generation: [],
    chat: [],
  };

  // Group log entries by taskType and model to get averages
  const taskModelGroup: Record<string, CostEntry[]> = {};
  for (const entry of logs) {
    const taskType = entry.metadata?.taskType || "unknown";
    const key = `${taskType}:${entry.model}`;
    if (!taskModelGroup[key]) {
      taskModelGroup[key] = [];
    }
    taskModelGroup[key].push(entry);
  }

  // Helper to determine model provider from name or task configs
  const getProvider = (model: string): string => {
    for (const config of Object.values(TASK_CONFIG)) {
      const candidate = config.candidates.find((c: any) => c.model === model);
      if (candidate) return candidate.provider;
    }
    if (model.includes("gemini")) return "google";
    if (model.includes("claude")) return "anthropic";
    if (model.includes("gpt")) return "microsoft";
    if (model.includes("llama") || model.includes("mistral")) return "ollama";
    return "unknown";
  };

  // Generate model options list for each task type
  const allTasks: ("rewrite" | "analysis" | "generation" | "chat")[] = [
    "rewrite",
    "analysis",
    "generation",
    "chat",
  ];

  for (const taskType of allTasks) {
    const config = TASK_CONFIG[taskType];
    if (!config) continue;

    for (const candidate of config.candidates) {
      const model = candidate.model;
      const provider = candidate.provider;
      const key = `${taskType}:${model}`;

      // Extract features for this model
      const costFeat = features.costFeatures[key] || { avgCost: 0, impliedVsRealRatio: 1.0 };
      const qualFeat = features.qualityFeatures[key] || { avgQuality: candidate.estimatedQuality };
      const usageFeat = features.usageFeatures[key] || { reliability: 1.0 };

      // Calculate latency
      const taskModelLogs = taskModelGroup[key] || [];
      const latencyLogs = taskModelLogs.filter(e => e.metadata?.latencyMs !== undefined);
      const avgLatency = latencyLogs.length > 0
        ? latencyLogs.reduce((sum, e) => sum + (e.metadata?.latencyMs ?? 0), 0) / latencyLogs.length
        : (PROVIDER_LATENCIES[provider] || PROVIDER_LATENCIES.unknown);

      // Perform evaluation calculations
      const avgCost = costFeat.avgCost;
      const avgQuality = qualFeat.avgQuality;
      const reliability = usageFeat.reliability;

      // cost per quality unit
      const costPerQuality = avgQuality > 0 ? avgCost / avgQuality : avgCost;

      // Score formula: score = (quality * wQ) - (cost * wC) + (reliability * wR)
      const score = (avgQuality * weights.wQ) - (avgCost * weights.wC) + (reliability * weights.wR);

      evaluations[taskType].push({
        model,
        provider,
        score,
        costPerQuality,
        reliability,
        avgLatency,
        avgCost,
        avgQuality,
      });
    }

    // Sort models by score (highest first)
    evaluations[taskType].sort((a, b) => b.score - a.score);
  }

  return evaluations;
}
