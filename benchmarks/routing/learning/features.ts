import { CostEntry } from "../../costs/models";
import { TASK_CONFIG } from "../policy";

export interface ExtractedFeatures {
  costFeatures: Record<string, {
    avgCost: number;
    variance: number;
    spikes: number;
    impliedVsRealRatio: number;
  }>;
  qualityFeatures: Record<string, {
    avgQuality: number;
    variance: number;
    baseQuality: number;
  }>;
  usageFeatures: Record<string, {
    avgTokens: number;
    fallbackRate: number;
    reliability: number;
    totalCalls: number;
  }>;
  temporalFeatures: {
    hourlySpend: Record<number, number>; // 0-23 -> USD
    dailySpend: Record<number, number>;  // 0-6 -> USD
  };
  localFeatures: {
    totalLocalSavingsUsd: number;
    localQualityPenalty: number; // Difference in average quality between cloud and local (Ollama)
  };
}

export function extractFeatures(logs: CostEntry[]): ExtractedFeatures {
  const costFeatures: ExtractedFeatures["costFeatures"] = {};
  const qualityFeatures: ExtractedFeatures["qualityFeatures"] = {};
  const usageFeatures: ExtractedFeatures["usageFeatures"] = {};
  
  const hourlySpend: Record<number, number> = {};
  const dailySpend: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hourlySpend[i] = 0;
  for (let i = 0; i < 7; i++) dailySpend[i] = 0;

  // Group logs by taskType + ":" + model
  const grouped: Record<string, CostEntry[]> = {};
  let totalLocalSavingsUsd = 0;

  for (const entry of logs) {
    const taskType = entry.metadata?.taskType || "unknown";
    const key = `${taskType}:${entry.model}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);

    // Track temporal spending
    const date = new Date(entry.timestamp);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    const spend = entry.amountUsd ?? 0;
    hourlySpend[hour] = (hourlySpend[hour] || 0) + spend;
    dailySpend[day] = (dailySpend[day] || 0) + spend;

    // Track local compute savings (implied cost vs actual cost if local)
    if (entry.provider === "ollama" || entry.costModel === "local") {
      totalLocalSavingsUsd += entry.impliedCostUsd - (entry.amountUsd ?? 0);
    }
  }

  // Helper function to get base quality from policy configuration
  const getBaseQuality = (taskType: string, model: string): number => {
    const config = TASK_CONFIG[taskType as keyof typeof TASK_CONFIG];
    if (config) {
      const candidate = config.candidates.find((c: any) => c.model === model);
      if (candidate) return candidate.estimatedQuality;
    }
    // General fallback weights if not specifically configured
    if (model.includes("opus")) return 9.5;
    if (model.includes("sonnet")) return 8.5;
    if (model.includes("pro")) return 8.0;
    if (model.includes("haiku") || model.includes("flash")) return 7.0;
    return 6.0; // Local / Ollama base
  };

  // Analyze each group
  for (const [key, entries] of Object.entries(grouped)) {
    const [taskType, model] = key.split(":");
    const count = entries.length;

    // Cost calculations
    const costs = entries.map(e => e.amountUsd ?? 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const avgCost = totalCost / count;
    
    let costVariance = 0;
    if (count > 1) {
      costVariance = costs.reduce((sum, val) => sum + Math.pow(val - avgCost, 2), 0) / (count - 1);
    }

    // Cost spikes: costs exceeding 1.5x average
    const spikes = costs.filter(c => c > avgCost * 1.5 && c > 0.001).length;

    // Implied vs Real ratio
    const totalImplied = entries.reduce((a, b) => a + b.impliedCostUsd, 0);
    const impliedVsRealRatio = totalCost > 0 ? totalImplied / totalCost : 1.0;

    costFeatures[key] = {
      avgCost,
      variance: costVariance,
      spikes,
      impliedVsRealRatio
    };

    // Quality calculations
    const qualities = entries.map(e => e.metadata?.qualityScore ?? getBaseQuality(taskType, model));
    const totalQuality = qualities.reduce((a, b) => a + b, 0);
    const avgQuality = totalQuality / count;

    let qualityVariance = 0;
    if (count > 1) {
      qualityVariance = qualities.reduce((sum, val) => sum + Math.pow(val - avgQuality, 2), 0) / (count - 1);
    }

    qualityFeatures[key] = {
      avgQuality,
      variance: qualityVariance,
      baseQuality: getBaseQuality(taskType, model)
    };

    // Usage calculations
    const tokens = entries.map(e => e.inputTokens + e.outputTokens);
    const avgTokens = tokens.reduce((a, b) => a + b, 0) / count;

    // Fallbacks
    const fallbackCount = entries.filter(e => e.metadata?.fallbackUsed === true).length;
    const fallbackRate = fallbackCount / count;

    // Success / reliability
    const successCount = entries.filter(e => e.metadata?.success !== false).length;
    const reliability = successCount / count;

    usageFeatures[key] = {
      avgTokens,
      fallbackRate,
      reliability,
      totalCalls: count
    };
  }

  // Local quality penalty calculations
  let cloudAvgQuality = 0;
  let cloudCount = 0;
  let localAvgQuality = 0;
  let localCount = 0;

  for (const [key, feat] of Object.entries(qualityFeatures)) {
    const [, model] = key.split(":");
    if (model.includes("llama") || model.includes("mistral") || model.includes("ollama")) {
      localAvgQuality += feat.avgQuality;
      localCount++;
    } else {
      cloudAvgQuality += feat.avgQuality;
      cloudCount++;
    }
  }

  const cloudQual = cloudCount > 0 ? cloudAvgQuality / cloudCount : 8.5;
  const localQual = localCount > 0 ? localAvgQuality / localCount : 6.0;
  const localQualityPenalty = Math.max(0, cloudQual - localQual);

  return {
    costFeatures,
    qualityFeatures,
    usageFeatures,
    hourlySpend,
    dailySpend,
    localFeatures: {
      totalLocalSavingsUsd,
      localQualityPenalty
    }
  };
}
