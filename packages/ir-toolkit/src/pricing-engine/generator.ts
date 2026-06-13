import type {
  ComponentCost,
  CostBreakdown,
  PricingAssumption,
  PricingCustomization,
  PricingQuote,
  PricingConfig
} from '../schemas/pricing.types.js';
import type { PreviewGallery } from '../schemas/preview.types.js';

export class PricingEngine {
  private config: Required<PricingConfig>;

  constructor(config: PricingConfig = {}) {
    this.config = {
      baseCosts: {
        discovery: config.baseCosts?.discovery ?? 5000,
        design: config.baseCosts?.design ?? 8000,
        development: config.baseCosts?.development ?? 25000,
        qa: config.baseCosts?.qa ?? 4000,
        deployment: config.baseCosts?.deployment ?? 2000
      },
      componentBaseCosts: {
        hero: config.componentBaseCosts?.hero ?? 4000,
        forms: config.componentBaseCosts?.forms ?? 3000,
        navigation: config.componentBaseCosts?.navigation ?? 3500,
        cards: config.componentBaseCosts?.cards ?? 2500,
        buttons: config.componentBaseCosts?.buttons ?? 1500,
        other: config.componentBaseCosts?.other ?? 2000
      },
      accessibilityMultiplier: config.accessibilityMultiplier ?? 1.2,
      tokenStandardizationMultiplier: config.tokenStandardizationMultiplier ?? 1.15,
      hoursPerDay: config.hoursPerDay ?? 8
    };
  }

  generate(gallery: PreviewGallery): PricingQuote {
    const componentCosts = this.calculateComponentCosts(gallery);
    const baseComponentTotal = componentCosts.reduce((sum, cc) => sum + cc.totalCost, 0);

    let total = baseComponentTotal;

    // Apply accessibility multiplier
    const hasAccessibilityWork = gallery.componentPreviews.some(c =>
      c.improvements.some(i => i.aspect === 'accessibility')
    );
    if (hasAccessibilityWork) {
      total *= this.config.accessibilityMultiplier;
    }

    // Apply token standardization multiplier
    if (gallery.designTokenDiffs.length > 3) {
      total *= this.config.tokenStandardizationMultiplier;
    }

    // Apply effort-based multiplier
    const effortMultiplier = this.getEffortMultiplier(gallery.estimatedTotalEffort);
    total *= effortMultiplier;

    // Round to nearest $500
    total = Math.round(total / 500) * 500;

    const breakdown = this.calculateCostBreakdown(total, gallery);
    const hours = this.estimateEffortHours(total);
    const tier = this.determineTier(total);
    const assumptions = this.generateAssumptions(gallery);
    const customizations = this.generateCustomizations(gallery);
    const timeline = this.calculateTimeline(hours, tier);

    return {
      url: gallery.url,
      estimateDateIso: new Date().toISOString(),
      totalEstimate: total,
      tier,
      breakdown,
      componentCosts,
      overallEffortHours: hours,
      confidenceLevel: this.calculateConfidence(gallery),
      assumptions,
      customizations,
      recommendedPaymentTerms: '50% upfront, 50% upon delivery',
      executionTimeline: timeline,
      summary: this.generateSummary(total, tier, gallery)
    };
  }

  private calculateComponentCosts(gallery: PreviewGallery): ComponentCost[] {
    return gallery.componentPreviews.map(preview => {
      const category = this.determineCategoryForComponent(preview, gallery);
      const baseCost = this.config.componentBaseCosts[category] ?? 2000;
      const effortValue = this.effortToMultiplier(preview.estimatedEffort);
      const complexityMult = Math.min(preview.currentComplexity / 100, 1.0);

      const totalCost = Math.round(
        baseCost * effortValue * (1 + complexityMult)
      );

      return {
        id: preview.id,
        name: preview.name,
        category,
        baseCost,
        effortMultiplier: effortValue,
        complexityMultiplier: complexityMult,
        totalCost
      };
    });
  }

  private determineCategoryForComponent(
    preview: any,
    gallery: PreviewGallery
  ): 'hero' | 'forms' | 'navigation' | 'cards' | 'buttons' | 'other' {
    const categories = gallery.componentCategories;
    const name = preview.name.toLowerCase();

    if (categories.hero.some(c => c.id === preview.id)) return 'hero';
    if (categories.forms.some(c => c.id === preview.id)) return 'forms';
    if (categories.navigation.some(c => c.id === preview.id)) return 'navigation';
    if (categories.cards.some(c => c.id === preview.id)) return 'cards';
    if (categories.buttons.some(c => c.id === preview.id)) return 'buttons';
    return 'other';
  }

  private effortToMultiplier(effort: 'low' | 'medium' | 'high'): number {
    switch (effort) {
      case 'low':
        return 1.0;
      case 'medium':
        return 1.5;
      case 'high':
        return 2.0;
      default:
        return 1.0;
    }
  }

  private getEffortMultiplier(effort: 'low' | 'medium' | 'high' | 'enterprise'): number {
    switch (effort) {
      case 'low':
        return 1.0;
      case 'medium':
        return 1.25;
      case 'high':
        return 1.5;
      case 'enterprise':
        return 2.0;
      default:
        return 1.0;
    }
  }

  private calculateCostBreakdown(total: number, gallery: PreviewGallery): CostBreakdown {
    const componentCount = gallery.componentPreviews.length;
    const routeCount = gallery.layoutDiffs.length;
    const tokenCount = gallery.designTokenDiffs.length;

    // Scale based on scope
    const scopeRatio = Math.min(componentCount / 10, 2.0); // 2x multiplier at 20+ components
    const discoveryRatio = Math.max(0.08, Math.min(0.12, 0.08 + tokenCount * 0.01));
    const designRatio = Math.max(0.15, Math.min(0.25, 0.15 + scopeRatio * 0.05));
    const devRatio = Math.max(0.45, Math.min(0.6, 0.45 + scopeRatio * 0.1));
    const qaRatio = 0.12;
    const deployRatio = 0.06;

    // Calculate amounts with independent rounding
    const discovery = Math.round(total * discoveryRatio);
    const design = Math.round(total * designRatio);
    const development = Math.round(total * devRatio);
    const qa = Math.round(total * qaRatio);
    const deployment = Math.round(total * deployRatio);

    // Ensure exact sum by adjusting the largest (development)
    const calculated = discovery + design + development + qa + deployment;
    const diff = total - calculated;

    return {
      discovery: {
        amount: discovery,
        reasoning: `Discovery + requirements gathering (${tokenCount} design aspects to align)`
      },
      design: {
        amount: design,
        reasoning: `Design system + component redesign (${componentCount} components)`
      },
      development: {
        amount: development + diff,
        reasoning: `Implementation + ${gallery.estimatedTotalEffort} effort level`
      },
      qa: {
        amount: qa,
        reasoning: `Testing + accessibility validation`
      },
      deployment: {
        amount: deployment,
        reasoning: `Deployment + client training + documentation`
      }
    };
  }

  private estimateEffortHours(total: number): number {
    const hourlyRate = 200;
    return Math.round(total / hourlyRate);
  }

  private determineTier(total: number): 'basic' | 'professional' | 'enterprise' {
    if (total < 75000) return 'basic';
    if (total < 150000) return 'professional';
    return 'enterprise';
  }

  private calculateConfidence(gallery: PreviewGallery): 'high' | 'medium' | 'low' {
    const categorizedComponents = Object.values(gallery.componentCategories).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    const categorizationRatio = categorizedComponents / gallery.componentPreviews.length;

    if (categorizationRatio > 0.9 && gallery.designTokenDiffs.length >= 3) {
      return 'high';
    }
    if (categorizationRatio > 0.7 && gallery.designTokenDiffs.length >= 2) {
      return 'medium';
    }
    return 'low';
  }

  private generateAssumptions(gallery: PreviewGallery): PricingAssumption[] {
    const assumptions: PricingAssumption[] = [];

    assumptions.push({
      factor: 'Component Count',
      impact: `${gallery.componentPreviews.length} components across ${gallery.componentCategories.hero.length + gallery.componentCategories.forms.length + gallery.componentCategories.navigation.length + gallery.componentCategories.cards.length + gallery.componentCategories.buttons.length + gallery.componentCategories.other.length} categories`
    });

    assumptions.push({
      factor: 'Effort Level',
      impact: `${gallery.estimatedTotalEffort} effort tier (${gallery.componentPreviews.filter(c => c.estimatedEffort === gallery.estimatedTotalEffort).length} components at this level)`
    });

    if (gallery.componentPreviews.some(c => c.improvements.some(i => i.aspect === 'accessibility'))) {
      assumptions.push({
        factor: 'Accessibility Work',
        impact: `20% cost increase for WCAG AA compliance`
      });
    }

    if (gallery.designTokenDiffs.length > 3) {
      assumptions.push({
        factor: 'Design System Standardization',
        impact: `15% cost increase for ${gallery.designTokenDiffs.length} design token categories`
      });
    }

    assumptions.push({
      factor: 'Project Scope',
      impact: `Covers redesign, implementation, testing, and launch`
    });

    return assumptions;
  }

  private generateCustomizations(gallery: PreviewGallery): PricingCustomization[] {
    const customizations: PricingCustomization[] = [];

    const hasComplexForms = gallery.componentCategories.forms.length > 0;
    if (hasComplexForms) {
      customizations.push({
        name: 'Advanced Form Builder Integration',
        description: 'Custom form validation, multi-step flows, conditional logic',
        estimatedCost: 8000,
        implementationDays: 5
      });
    }

    const hasNavigation = gallery.componentCategories.navigation.length > 0;
    if (hasNavigation) {
      customizations.push({
        name: 'Navigation Pattern Library',
        description: 'Mega menu, mobile drawer, breadcrumb systems',
        estimatedCost: 5000,
        implementationDays: 3
      });
    }

    const highComplexityComponents = gallery.componentPreviews.filter(
      c => c.currentComplexity > 70
    ).length;
    if (highComplexityComponents > 2) {
      customizations.push({
        name: 'Custom Component Animation Suite',
        description: 'Micro-interactions, transitions, entrance effects',
        estimatedCost: 6000,
        implementationDays: 4
      });
    }

    customizations.push({
      name: 'Analytics Integration & Tracking',
      description: 'Custom event tracking, conversion funnels, heatmaps',
      estimatedCost: 4000,
      implementationDays: 3
    });

    customizations.push({
      name: 'Premium Support (3 months)',
      description: 'Dedicated support channel, bug fixes, optimization',
      estimatedCost: 5000,
      implementationDays: 90
    });

    return customizations;
  }

  private calculateTimeline(
    hours: number,
    tier: 'basic' | 'professional' | 'enterprise'
  ): PricingQuote['executionTimeline'] {
    const hoursPerDay = this.config.hoursPerDay;
    const totalDays = Math.ceil(hours / hoursPerDay);

    // Distribute hours across phases
    const discovery = Math.ceil(hours * 0.08 / hoursPerDay);
    const design = Math.ceil(hours * 0.20 / hoursPerDay);
    const development = Math.ceil(hours * 0.50 / hoursPerDay);
    const qa = Math.ceil(hours * 0.12 / hoursPerDay);
    const deployment = Math.ceil(hours * 0.10 / hoursPerDay);

    return {
      discovery,
      design,
      development,
      qa,
      deployment,
      total: discovery + design + development + qa + deployment
    };
  }

  private generateSummary(total: number, tier: string, gallery: PreviewGallery): string {
    const format = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    const components = gallery.componentPreviews.length;

    const tierDescription = tier === 'basic' ? 'foundational redesign'
      : tier === 'professional' ? 'comprehensive redesign'
      : 'enterprise-grade transformation';

    return `${tierDescription.charAt(0).toUpperCase()}${tierDescription.slice(1)} for ${components} components. Estimated investment: ${format(total)}.`;
  }
}

export function generatePricing(gallery: PreviewGallery, config?: PricingConfig) {
  const engine = new PricingEngine(config);
  return engine.generate(gallery);
}
