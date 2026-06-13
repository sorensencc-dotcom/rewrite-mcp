export interface ComponentCost {
  id: string;
  name: string;
  category: 'hero' | 'forms' | 'navigation' | 'cards' | 'buttons' | 'other';
  baseCost: number; // Starting cost in USD
  effortMultiplier: number; // Based on estimated effort
  complexityMultiplier: number; // 0-100 based on complexity
  totalCost: number; // baseCost * effortMultiplier * (1 + complexityMultiplier/100)
}

export interface CostBreakdown {
  discovery: { amount: number; reasoning: string };
  design: { amount: number; reasoning: string };
  development: { amount: number; reasoning: string };
  qa: { amount: number; reasoning: string };
  deployment: { amount: number; reasoning: string };
}

export interface PricingAssumption {
  factor: string;
  impact: string; // Description of how this affects cost
}

export interface PricingCustomization {
  name: string;
  description: string;
  estimatedCost: number;
  implementationDays: number;
}

export interface PricingQuote {
  url: string;
  estimateDateIso: string;
  totalEstimate: number; // Total USD cost
  tier: 'basic' | 'professional' | 'enterprise';
  breakdown: CostBreakdown;
  componentCosts: ComponentCost[];
  overallEffortHours: number; // Estimated total hours
  confidenceLevel: 'high' | 'medium' | 'low';
  assumptions: PricingAssumption[];
  customizations: PricingCustomization[];
  recommendedPaymentTerms: string;
  executionTimeline: {
    discovery: number; // days
    design: number;
    development: number;
    qa: number;
    deployment: number;
    total: number;
  };
  summary: string; // Sales-ready summary
}

export interface PricingConfig {
  baseCosts?: {
    discovery?: number;
    design?: number;
    development?: number;
    qa?: number;
    deployment?: number;
  };
  componentBaseCosts?: {
    hero?: number;
    forms?: number;
    navigation?: number;
    cards?: number;
    buttons?: number;
    other?: number;
  };
  accessibilityMultiplier?: number; // Default 1.2 (20% increase)
  tokenStandardizationMultiplier?: number; // Default 1.15 (15% increase)
  hoursPerDay?: number; // For timeline calculation, default 8
}
