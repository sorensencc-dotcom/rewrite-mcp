export interface ComponentCost {
    id: string;
    name: string;
    category: 'hero' | 'forms' | 'navigation' | 'cards' | 'buttons' | 'other';
    baseCost: number;
    effortMultiplier: number;
    complexityMultiplier: number;
    totalCost: number;
}
export interface CostBreakdown {
    discovery: {
        amount: number;
        reasoning: string;
    };
    design: {
        amount: number;
        reasoning: string;
    };
    development: {
        amount: number;
        reasoning: string;
    };
    qa: {
        amount: number;
        reasoning: string;
    };
    deployment: {
        amount: number;
        reasoning: string;
    };
}
export interface PricingAssumption {
    factor: string;
    impact: string;
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
    totalEstimate: number;
    tier: 'basic' | 'professional' | 'enterprise';
    breakdown: CostBreakdown;
    componentCosts: ComponentCost[];
    overallEffortHours: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    assumptions: PricingAssumption[];
    customizations: PricingCustomization[];
    recommendedPaymentTerms: string;
    executionTimeline: {
        discovery: number;
        design: number;
        development: number;
        qa: number;
        deployment: number;
        total: number;
    };
    summary: string;
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
    accessibilityMultiplier?: number;
    tokenStandardizationMultiplier?: number;
    hoursPerDay?: number;
}
