export type Provider = "anthropic" | "google" | "microsoft" | "ollama";

export type Source =
  | "benchmark"
  | "cli:claude-code"
  | "cli:copilot"
  | "api:direct"
  | "local:ollama";

export type CostModel = "subscription" | "overage" | "direct" | "free" | "local";

export interface CostEntry {
  timestamp: string; // ISO8601
  provider: Provider;
  model: string;
  source: Source;
  inputTokens: number;
  outputTokens: number;
  costModel: CostModel;
  amountUsd: number | null; // real billed cost
  impliedCostUsd: number; // subscription/local equivalent
  metadata?: {
    site?: string;
    taskType?: "rewrite" | "analysis" | "generation" | "chat";
    qualityScore?: number;
    command?: string;
    phase?: number;
  };
}

export const PROVIDER_PRICING = {
  anthropic: {
    "claude-opus-4-8": { inputPerMTokUsd: 15, outputPerMTokUsd: 60 },
    "claude-sonnet-4-6": { inputPerMTokUsd: 3, outputPerMTokUsd: 15 },
    "claude-haiku-4-5": { inputPerMTokUsd: 0.8, outputPerMTokUsd: 4 },
  },
  google: {
    "gemini-2.0-pro": { inputPerMTokUsd: 10, outputPerMTokUsd: 40 },
    "gemini-1.5-pro": { inputPerMTokUsd: 7, outputPerMTokUsd: 28 },
    "gemini-1.5-flash": { inputPerMTokUsd: 0.75, outputPerMTokUsd: 3 },
  },
  microsoft: {
    "gpt-4o": { inputPerMTokUsd: 5, outputPerMTokUsd: 15 },
    "gpt-4-turbo": { inputPerMTokUsd: 10, outputPerMTokUsd: 30 },
  },
  ollama: {
    "llama2": { cloudEquivalentModel: "claude-sonnet-4-6" },
    "mistral": { cloudEquivalentModel: "claude-sonnet-4-6" },
  },
} as const;

export function estimateDirectCostUsd(
  provider: Provider,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PROVIDER_PRICING[provider];
  if (!pricing) return 0;

  const modelPricing = pricing[model as keyof typeof pricing];
  if (!modelPricing) return 0;

  if ("cloudEquivalentModel" in modelPricing) return 0;

  const inputMTok = inputTokens / 1_000_000;
  const outputMTok = outputTokens / 1_000_000;
  return inputMTok * modelPricing.inputPerMTokUsd + outputMTok * modelPricing.outputPerMTokUsd;
}
