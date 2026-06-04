export type TaskType = "rewrite" | "analysis" | "generation" | "chat";

export interface RoutingContext {
  taskType: TaskType;
  qualityTarget: number; // 1–10
  maxCostUsd?: number; // per request
  dailyBudgetUsd?: number; // per day
}

export interface ModelOption {
  provider: "anthropic" | "google" | "microsoft" | "ollama";
  model: string;
  estimatedQuality: number; // 1–10
}

export interface RoutingDecision {
  chosen: ModelOption;
  alternatives: ModelOption[];
  reason: string;
  costEstimateUsd: number;
}

export type CostAgentEvent =
  | { type: "budget-warning"; level: "hourly" | "daily"; spendUsd: number }
  | { type: "switch-to-cheaper"; reason: string }
  | { type: "prefer-local"; reason: string };

// Task-specific candidate pools and token estimates
export const TASK_CONFIG = {
  rewrite: {
    estimatedInputTokens: 3000,
    estimatedOutputTokens: 3000,
    candidates: [
      { provider: "anthropic", model: "claude-opus-4-8", estimatedQuality: 9.5 },
      { provider: "anthropic", model: "claude-sonnet-4-6", estimatedQuality: 8.5 },
      { provider: "google", model: "gemini-2.0-pro", estimatedQuality: 8.0 },
      { provider: "ollama", model: "llama2", estimatedQuality: 6.5 },
    ],
  },
  analysis: {
    estimatedInputTokens: 2000,
    estimatedOutputTokens: 1500,
    candidates: [
      { provider: "anthropic", model: "claude-opus-4-8", estimatedQuality: 9.5 },
      { provider: "anthropic", model: "claude-sonnet-4-6", estimatedQuality: 8.5 },
      { provider: "google", model: "gemini-2.0-pro", estimatedQuality: 8.0 },
      { provider: "ollama", model: "llama2", estimatedQuality: 6.0 },
    ],
  },
  generation: {
    estimatedInputTokens: 500,
    estimatedOutputTokens: 2000,
    candidates: [
      { provider: "anthropic", model: "claude-sonnet-4-6", estimatedQuality: 8.5 },
      { provider: "anthropic", model: "claude-haiku-4-5", estimatedQuality: 7.0 },
      { provider: "google", model: "gemini-1.5-flash", estimatedQuality: 7.5 },
      { provider: "ollama", model: "mistral", estimatedQuality: 5.5 },
    ],
  },
  chat: {
    estimatedInputTokens: 800,
    estimatedOutputTokens: 500,
    candidates: [
      { provider: "anthropic", model: "claude-sonnet-4-6", estimatedQuality: 8.5 },
      { provider: "anthropic", model: "claude-haiku-4-5", estimatedQuality: 7.0 },
      { provider: "google", model: "gemini-1.5-flash", estimatedQuality: 7.5 },
      { provider: "ollama", model: "llama2", estimatedQuality: 5.0 },
    ],
  },
} as const;

// Default budget constraints
export const DEFAULT_CONSTRAINTS = {
  dailyBudgetUsd: 10.0,
  hourlyBudgetUsd: 1.0,
  maxCostPerRequestUsd: 0.25,
  shiftToLocalThreshold: 0.7, // 70% of budget spent → prefer local
};
