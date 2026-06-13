import type {
  ComponentImprovement,
  ComponentPreview,
  DesignTokenDiff,
  LayoutDiff,
  PreviewGallery,
  PreviewGeneratorConfig
} from '../schemas/preview.types.js';
import type { IRPacket } from '../schemas/ir.types.js';

export class PreviewGenerator {
  private config: PreviewGeneratorConfig;

  constructor(config: PreviewGeneratorConfig = {}) {
    this.config = {
      focusOnAccessibility: config.focusOnAccessibility ?? true,
      emphasizeVisualDesign: config.emphasizeVisualDesign ?? true,
      includePerformance: config.includePerformance ?? true,
      detailLevel: config.detailLevel ?? 'detailed'
    };
  }

  generate(ir: IRPacket): PreviewGallery {
    const componentPreviews = this.generateComponentPreviews(ir);
    const layoutDiffs = this.generateLayoutDiffs(ir);
    const designTokenDiffs = this.generateDesignTokenDiffs(ir);
    const overallScore = this.calculateOverallScore(componentPreviews, layoutDiffs, designTokenDiffs);
    const componentCategories = this.categorizeComponents(componentPreviews);

    const transformationNarrative = this.generateNarrative(
      ir,
      componentPreviews,
      overallScore
    );

    const keyHighlights = this.extractKeyHighlights(
      componentPreviews,
      layoutDiffs,
      designTokenDiffs
    );

    const estimatedEffort = this.estimateOverallEffort(componentPreviews);

    return {
      url: ir.meta.url,
      title: `Redesign Preview for ${new URL(ir.meta.url).hostname}`,
      before: {
        type: 'before',
        timestamp: ir.meta.captureDate,
        description: 'Current state of your website',
        summary: this.generateBeforeSummary(ir)
      },
      after: {
        type: 'after',
        timestamp: new Date().toISOString(),
        description: 'Recommended improvements and redesign',
        summary: this.generateAfterSummary(ir, overallScore)
      },
      componentPreviews,
      layoutDiffs,
      designTokenDiffs,
      overallImprovementScore: overallScore,
      transformationNarrative,
      keyHighlights,
      estimatedTotalEffort: estimatedEffort,
      componentCategories
    };
  }

  private generateComponentPreviews(ir: IRPacket): ComponentPreview[] {
    return ir.components.map(comp => {
      const improvements = this.generateImprovements(comp, ir);
      const improvementScore = improvements.length > 0
        ? Math.round(improvements.reduce((sum, imp) => sum + imp.impactScore, 0) / improvements.length)
        : 0;

      return {
        id: comp.id,
        name: comp.name,
        type: comp.type,
        currentUsageCount: comp.usageCount,
        currentComplexity: comp.complexity ?? 0,
        improvements,
        improvementScore,
        estimatedEffort: this.estimateComponentEffort(comp, improvements),
        visualDescription: this.describeComponent(comp),
        beforeState: `Current: ${comp.name} (${comp.type}, used ${comp.usageCount}x)`,
        afterState: `Improved: ${comp.name} with enhanced ${improvements.map(i => i.aspect).join(', ')}`
      };
    });
  }

  private generateImprovements(
    comp: any,
    ir: IRPacket
  ): ComponentImprovement[] {
    const improvements: ComponentImprovement[] = [];

    // Accessibility improvements
    if (this.config.focusOnAccessibility && ir.metrics?.accessibility?.wcagIssues) {
      improvements.push({
        aspect: 'accessibility',
        current: 'WCAG compliance issues present',
        proposed: 'Full WCAG AA compliance',
        rationale: 'Expands audience reach and reduces legal risk',
        impactScore: 85
      });
    }

    // Visual improvements
    if (this.config.emphasizeVisualDesign) {
      improvements.push({
        aspect: 'visual',
        current: `Current design style`,
        proposed: `Modern, consistent design system`,
        rationale: 'Improves perceived quality and brand trust',
        impactScore: 70
      });
    }

    // Interaction improvements
    if (comp.usageCount > 1) {
      improvements.push({
        aspect: 'interaction',
        current: `Inconsistent interaction patterns`,
        proposed: `Unified component behavior`,
        rationale: 'Reduces cognitive load and increases conversion',
        impactScore: 60
      });
    }

    // Performance improvements
    if (this.config.includePerformance) {
      improvements.push({
        aspect: 'performance',
        current: `Standard performance`,
        proposed: `Optimized loading and rendering`,
        rationale: 'Faster page loads improve SEO and user satisfaction',
        impactScore: 65
      });
    }

    // Layout improvements
    if (comp.complexity && comp.complexity > 50) {
      improvements.push({
        aspect: 'layout',
        current: `Complex component structure`,
        proposed: `Simplified, modular layout`,
        rationale: 'Easier to maintain and scale',
        impactScore: 55
      });
    }

    return this.config.detailLevel === 'summary' ? improvements.slice(0, 3) : improvements;
  }

  private generateLayoutDiffs(ir: IRPacket): LayoutDiff[] {
    const diffs: LayoutDiff[] = [];

    if (ir.routes.length > 3) {
      diffs.push({
        aspect: 'responsive',
        current: `${ir.routes.length} routes with inconsistent breakpoints`,
        proposed: `Unified responsive grid (mobile-first)`,
        rationale: 'Better mobile experience, easier maintenance',
        impactScore: 75
      });
    }

    if (ir.components.length > 10) {
      diffs.push({
        aspect: 'spacing',
        current: `Inconsistent spacing scale`,
        proposed: `Standard spacing system (4px grid)`,
        rationale: 'Visual consistency and predictability',
        impactScore: 60
      });
    }

    diffs.push({
      aspect: 'grid',
      current: `Ad-hoc layout structure`,
      proposed: `CSS Grid / Flexbox system`,
      rationale: 'More flexible, maintainable layouts',
      impactScore: 65
    });

    diffs.push({
      aspect: 'alignment',
      current: `Manual alignment`,
      proposed: `Auto-aligned with spacing rules`,
      rationale: 'Pixel-perfect consistency',
      impactScore: 50
    });

    return this.config.detailLevel === 'summary' ? diffs.slice(0, 3) : diffs;
  }

  private generateDesignTokenDiffs(ir: IRPacket): DesignTokenDiff[] {
    const diffs: DesignTokenDiff[] = [];

    const colorCount = Object.keys(ir.designTokens?.colors ?? {}).length;
    if (colorCount > 8) {
      diffs.push({
        category: 'color',
        currentValue: `${colorCount} custom colors`,
        proposedValue: `8-color system (primary, secondary, grays, semantic)`,
        rationale: 'Reduces decision fatigue, improves consistency',
        affectedCount: ir.components.length,
        impactScore: 70
      });
    }

    const spacingCount = Object.keys(ir.designTokens?.spacing ?? {}).length;
    if (spacingCount > 6) {
      diffs.push({
        category: 'spacing',
        currentValue: `${spacingCount} spacing values`,
        proposedValue: `Consistent 4px-based scale (xs, sm, md, lg, xl, xxl)`,
        rationale: 'Predictable layouts, easier to scale',
        affectedCount: ir.components.length,
        impactScore: 65
      });
    }

    diffs.push({
      category: 'typography',
      currentValue: `Varied font usage`,
      proposedValue: `2-3 font family system with clear hierarchy`,
      rationale: 'Improved readability and professional appearance',
      affectedCount: Math.round(ir.components.length * 0.8),
      impactScore: 60
    });

    diffs.push({
      category: 'shadow',
      currentValue: `Inconsistent shadows`,
      proposedValue: `Elevation system (sm, md, lg, xl)`,
      rationale: 'Creates visual depth and hierarchy',
      affectedCount: Math.round(ir.components.length * 0.6),
      impactScore: 45
    });

    return this.config.detailLevel === 'summary' ? diffs.slice(0, 2) : diffs;
  }

  private calculateOverallScore(
    componentPreviews: ComponentPreview[],
    layoutDiffs: LayoutDiff[],
    designTokenDiffs: DesignTokenDiff[]
  ): number {
    const componentScore = componentPreviews.length > 0
      ? Math.round(componentPreviews.reduce((sum, c) => sum + c.improvementScore, 0) / componentPreviews.length)
      : 0;

    const layoutScore = layoutDiffs.length > 0
      ? Math.round(layoutDiffs.reduce((sum, d) => sum + d.impactScore, 0) / layoutDiffs.length)
      : 0;

    const tokenScore = designTokenDiffs.length > 0
      ? Math.round(designTokenDiffs.reduce((sum, d) => sum + d.impactScore, 0) / designTokenDiffs.length)
      : 0;

    return Math.round((componentScore * 0.5 + layoutScore * 0.25 + tokenScore * 0.25));
  }

  private estimateComponentEffort(comp: any, improvements: ComponentImprovement[]): 'low' | 'medium' | 'high' {
    const complexityScore = comp.complexity ?? 0;
    const improvementCount = improvements.length;

    if (complexityScore < 30 && improvementCount < 2) return 'low';
    if (complexityScore > 70 && improvementCount > 3) return 'high';
    return 'medium';
  }

  private estimateOverallEffort(
    componentPreviews: ComponentPreview[]
  ): 'low' | 'medium' | 'high' | 'enterprise' {
    const highCount = componentPreviews.filter(c => c.estimatedEffort === 'high').length;
    const mediumCount = componentPreviews.filter(c => c.estimatedEffort === 'medium').length;

    if (highCount > 10) return 'enterprise';
    if (highCount > 5 || mediumCount > 15) return 'high';
    if (mediumCount > 5) return 'medium';
    return 'low';
  }

  private categorizeComponents(
    componentPreviews: ComponentPreview[]
  ): PreviewGallery['componentCategories'] {
    const categories = {
      hero: [] as ComponentPreview[],
      forms: [] as ComponentPreview[],
      navigation: [] as ComponentPreview[],
      cards: [] as ComponentPreview[],
      buttons: [] as ComponentPreview[],
      other: [] as ComponentPreview[]
    };

    for (const comp of componentPreviews) {
      const name = comp.name.toLowerCase();
      if (name.includes('hero')) categories.hero.push(comp);
      else if (name.includes('form') || name.includes('input')) categories.forms.push(comp);
      else if (name.includes('nav') || name.includes('menu')) categories.navigation.push(comp);
      else if (name.includes('card')) categories.cards.push(comp);
      else if (name.includes('button') || name.includes('btn')) categories.buttons.push(comp);
      else categories.other.push(comp);
    }

    return categories;
  }

  private generateNarrative(ir: IRPacket, componentPreviews: ComponentPreview[], score: number): string {
    const hostname = new URL(ir.meta.url).hostname;
    const highImpactComps = componentPreviews.filter(c => c.improvementScore > 70);

    const scoreDescription = score > 80 ? 'transformative'
      : score > 60 ? 'significant'
      : score > 40 ? 'moderate'
      : 'foundational';

    return `${hostname} has a ${scoreDescription} redesign opportunity. Current design has ${componentPreviews.length} components with proven improvement potential. Key focus areas include ${highImpactComps.map(c => c.name).slice(0, 3).join(', ')}. Implementing these changes would improve accessibility, visual consistency, and user experience while modernizing the technical foundation.`;
  }

  private generateBeforeSummary(ir: IRPacket): string {
    const hostname = new URL(ir.meta.url).hostname;
    const wcagIssues = ir.metrics?.accessibility?.wcagIssues ?? 0;
    const auditSeverity = ir.metrics?.accessibility?.severity ?? 'unknown';

    return `${hostname} currently has ${ir.components.length} components across ${ir.routes.length} routes with ${wcagIssues} accessibility issues (${auditSeverity} severity).`;
  }

  private generateAfterSummary(ir: IRPacket, score: number): string {
    return `Recommended improvements score ${score}/100. Implement design system, improve accessibility, modernize components, and create consistent user experience across all pages.`;
  }

  private describeComponent(comp: any): string {
    return `${comp.name} (${comp.type}) — Used ${comp.usageCount} time(s), Complexity: ${comp.complexity ?? 'unknown'}`;
  }

  private extractKeyHighlights(
    componentPreviews: ComponentPreview[],
    layoutDiffs: LayoutDiff[],
    designTokenDiffs: DesignTokenDiff[]
  ): string[] {
    const highlights: string[] = [];

    const topComponents = componentPreviews
      .sort((a, b) => b.improvementScore - a.improvementScore)
      .slice(0, 3);

    if (topComponents.length > 0) {
      highlights.push(
        `${topComponents.map(c => c.name).join(', ')} — highest improvement potential`
      );
    }

    if (layoutDiffs.length > 0) {
      highlights.push(
        `Layout system — ${layoutDiffs[0].rationale}`
      );
    }

    if (designTokenDiffs.length > 0) {
      highlights.push(
        `Design tokens — Standardize ${designTokenDiffs.map(d => d.category).join(', ')}`
      );
    }

    if (componentPreviews.filter(c => c.improvements.some(i => i.aspect === 'accessibility')).length > 0) {
      highlights.push('Accessibility — Significant WCAG compliance gains');
    }

    return highlights.slice(0, 5);
  }
}

export function generatePreview(ir: IRPacket, config?: PreviewGeneratorConfig) {
  const generator = new PreviewGenerator(config);
  return generator.generate(ir);
}
