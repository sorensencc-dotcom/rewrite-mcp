import { Provider } from "./models";

interface SubscriptionTier {
  name: string;
  provider: Provider;
  monthlyFeeUsd: number;
  monthlyAllocationTokens: number;
}

export const SUBSCRIPTIONS: Record<string, SubscriptionTier> = {
  "claude-pro": {
    name: "Claude Pro",
    provider: "anthropic",
    monthlyFeeUsd: 20,
    monthlyAllocationTokens: 50_000_000,
  },
  "gemini-advanced": {
    name: "Gemini Advanced",
    provider: "google",
    monthlyFeeUsd: 9.99,
    monthlyAllocationTokens: 50_000_000,
  },
  "copilot-free": {
    name: "Copilot Free",
    provider: "microsoft",
    monthlyFeeUsd: 0,
    monthlyAllocationTokens: 0,
  },
};

export function impliedSubscriptionRatePerToken(
  tierKey: keyof typeof SUBSCRIPTIONS
): number {
  const tier = SUBSCRIPTIONS[tierKey];
  if (!tier.monthlyAllocationTokens || tier.monthlyFeeUsd === 0) return 0;
  return tier.monthlyFeeUsd / tier.monthlyAllocationTokens;
}
