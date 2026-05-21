// apps/cic-pms/src/modelRouter.js
// Dynamic Model Router (DMR) — Phase-27
// v1.0.0

import { getRecentModelCalls } from "./telemetryCache.js";

const MODEL_CONFIGS = {
  gemini: { 
    name: "gemini", 
    cost: 1.0,
    retries: 3, 
    backoff: (i) => 250 * Math.pow(2, i) 
  },
  claude: { 
    name: "claude", 
    cost: 1.2,
    retries: 2, 
    backoff: (i) => 400 * Math.pow(2, i) 
  },
  llama: { 
    name: "llama", 
    cost: 0.4,
    retries: 1, 
    backoff: () => 500 
  }
};

const cooldowns = new Map();

/**
 * Marks a model as cooling down (e.g., due to 429).
 * @param {string} model - Model name.
 * @param {number} ms - Cooldown duration in ms.
 */
export function markModelCooldown(model, ms) {
  console.log(`[DMR] Model ${model} entering cooldown for ${ms}ms`);
  cooldowns.set(model, Date.now() + ms);
}

function isCooling(model) {
  const until = cooldowns.get(model);
  return until && until > Date.now();
}

/**
 * Computes scores for all models based on recent telemetry.
 */
export function computeModelScores() {
  const calls = getRecentModelCalls(200);

  const stats = {};
  for (const key in MODEL_CONFIGS) {
    stats[key] = {
      success: 0,
      fail429: 0,
      fail5xx: 0,
      latency: [],
      total: 0
    };
  }

  for (const c of calls) {
    const s = stats[c.model];
    if (!s) continue;

    s.total++;
    if (c.success) s.success++;
    if (c.errorCode === 429) s.fail429++;
    if (c.errorCode >= 500) s.fail5xx++;
    if (c.latencyMs) s.latency.push(c.latencyMs);
  }

  const scores = {};
  for (const key in MODEL_CONFIGS) {
    const s = stats[key];
    const m = MODEL_CONFIGS[key];

    const successRate = s.total ? s.success / s.total : 0.95; // Default to optimistic if no data
    const avgLatency = s.latency.length
      ? s.latency.reduce((a, b) => a + b, 0) / s.latency.length
      : 500;

    const fail429Rate = s.total ? s.fail429 / s.total : 0;
    const fail5xxRate = s.total ? s.fail5xx / s.total : 0;

    // Weighted scoring formula
    const score =
      0.50 * successRate +
      0.20 * (1 / (1 + avgLatency / 1000)) + // Latency normalized to seconds
      0.15 * (1 - fail429Rate) +
      0.15 * (1 - fail5xxRate);

    scores[key] = {
      score,
      efficiency: score / m.cost,
      cooling: isCooling(key)
    };
  }

  return scores;
}

/**
 * Returns a dynamic model chain ordered by efficiency.
 */
export function getDynamicModelChain() {
  const scores = computeModelScores();

  const ranked = Object.values(MODEL_CONFIGS)
    .map(m => ({
      ...m,
      efficiency: scores[m.name].efficiency,
      cooling: scores[m.name].cooling
    }))
    .filter(m => !m.cooling)
    .sort((a, b) => b.efficiency - a.efficiency);

  if (ranked.length === 0) {
    // If all models are cooling, return all (hope for the best)
    return Object.values(MODEL_CONFIGS);
  }

  return ranked;
}
