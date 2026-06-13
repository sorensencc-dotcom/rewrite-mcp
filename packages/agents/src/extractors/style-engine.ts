import type { DomModel } from './dom.js';

export interface CssRule {
  selector: string;
  properties: Record<string, string>;
  specificity: number;
}

export interface StyleSheet {
  rules: CssRule[];
  fonts: string[];
  variables: Record<string, string>;
}

export interface StyleMetrics {
  totalSelectors: number;
  uniqueClasses: number;
  uniqueIds: number;
  colorCount: number;
  fontFamilies: string[];
  breakpoints: string[];
  transitionCount: number;
  animationCount: number;
}

export class StyleMatchEngine {
  /**
   * Parse CSS from style tags and external stylesheets in DOM.
   * Returns aggregated stylesheet with extracted rules and metadata.
   */
  parseStylesheet(dom: DomModel, cssText?: string): StyleSheet {
    const rules: CssRule[] = [];
    const fonts: string[] = [];
    const variables: Record<string, string> = {};

    if (cssText) {
      const parsed = this.parseCss(cssText);
      rules.push(...parsed.rules);
      fonts.push(...parsed.fonts);
      Object.assign(variables, parsed.variables);
    }

    return { rules, fonts, variables };
  }

  /**
   * Calculate style metrics from DOM and stylesheet.
   */
  metrics(dom: DomModel, stylesheet: StyleSheet): StyleMetrics {
    const uniqueClasses = new Set<string>();
    const uniqueIds = new Set<string>();
    const colors = new Set<string>();
    const fonts = new Set<string>();
    const breakpoints = new Set<string>();
    let transitionCount = 0;
    let animationCount = 0;

    // Walk DOM to collect class/ID usage (root may be null in test fixtures)
    if (dom.root) this.walkDom(dom.root, (node) => {
      if (node.id) uniqueIds.add(node.id);
      for (const cls of node.classes) {
        uniqueClasses.add(cls);
      }
    });

    // Extract from stylesheet
    for (const rule of stylesheet.rules) {
      const classMatch = rule.selector.match(/\.([\w-]+)/g);
      if (classMatch) {
        for (const cls of classMatch) {
          uniqueClasses.add(cls.slice(1));
        }
      }

      // Count transitions/animations
      if (rule.properties['transition']) transitionCount++;
      if (rule.properties['animation']) animationCount++;

      // Extract colors
      const colorPattern = /#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsl\([^)]+\)/gi;
      for (const color of rule.properties.color?.match(colorPattern) ?? []) {
        colors.add(color);
      }
      for (const color of rule.properties['background-color']?.match(colorPattern) ?? []) {
        colors.add(color);
      }
    }

    // Extract fonts
    for (const font of stylesheet.fonts) {
      fonts.add(font);
    }

    // Detect breakpoints
    const mediaPattern = /\(max-width:\s*(\d+)px\)|\(min-width:\s*(\d+)px\)/g;
    for (const rule of stylesheet.rules) {
      const matches = rule.selector.matchAll(mediaPattern);
      for (const match of matches) {
        breakpoints.add(match[1] ?? match[2] ?? '');
      }
    }

    return {
      totalSelectors: stylesheet.rules.length,
      uniqueClasses: uniqueClasses.size,
      uniqueIds: uniqueIds.size,
      colorCount: colors.size,
      fontFamilies: Array.from(fonts),
      breakpoints: Array.from(breakpoints),
      transitionCount,
      animationCount,
    };
  }

  private parseCss(cssText: string): { rules: CssRule[]; fonts: string[]; variables: Record<string, string> } {
    const rules: CssRule[] = [];
    const fonts: string[] = [];
    const variables: Record<string, string> = {};

    // Simple CSS parser (minimal, not full spec)
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const propertiesStr = match[2];

      if (selector.startsWith('@font-face') || selector.includes('@import')) {
        const fontFamily = propertiesStr.match(/font-family:\s*['"]?([^'";}]+)/);
        if (fontFamily) fonts.push(fontFamily[1]);
      } else if (selector.startsWith(':root')) {
        const varPattern = /(--[\w-]+):\s*([^;]+);/g;
        let varMatch;
        while ((varMatch = varPattern.exec(propertiesStr)) !== null) {
          variables[varMatch[1]] = varMatch[2].trim();
        }
      } else {
        const properties = this.parseProperties(propertiesStr);
        const specificity = this.calculateSpecificity(selector);
        rules.push({ selector, properties, specificity });
      }
    }

    return { rules, fonts, variables };
  }

  private parseProperties(propStr: string): Record<string, string> {
    const props: Record<string, string> = {};
    const propPattern = /([\w-]+):\s*([^;]+);/g;
    let match;

    while ((match = propPattern.exec(propStr)) !== null) {
      props[match[1]] = match[2].trim();
    }

    return props;
  }

  private calculateSpecificity(selector: string): number {
    // Simple specificity: IDs (100) > classes (10) > elements (1)
    const idCount = (selector.match(/#/g) ?? []).length;
    const classCount = (selector.match(/\./g) ?? []).length;
    const elementCount = selector.split(/[\s+>~]+/).filter(s => s && !s.startsWith('#') && !s.startsWith('.')).length;

    return idCount * 100 + classCount * 10 + elementCount;
  }

  private walkDom(node: any, callback: (node: any) => void): void {
    callback(node);
    for (const child of node.children ?? []) {
      this.walkDom(child, callback);
    }
  }
}
