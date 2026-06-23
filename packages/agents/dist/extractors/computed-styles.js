export class ComputedStylesAnalyzer {
    /**
     * Analyze computed styles to extract design system info.
     * Returns aggregated metrics and patterns.
     */
    analyze(computedStyles) {
        const metrics = {
            totalElements: computedStyles.length,
            uniqueColors: new Map(),
            uniqueFonts: new Map(),
            uniqueFontSizes: new Map(),
            layoutPatterns: new Map(),
            displayModes: new Map(),
            spacingValues: new Map(),
            zIndexLayers: [],
            mediaQueries: new Set(),
        };
        for (const style of computedStyles) {
            const computed = style.computed;
            // Collect colors
            this.collectValue(metrics.uniqueColors, computed.color);
            this.collectValue(metrics.uniqueColors, computed['background-color']);
            this.collectValue(metrics.uniqueColors, computed['border-color']);
            // Collect typography
            this.collectValue(metrics.uniqueFonts, computed['font-family']);
            this.collectValue(metrics.uniqueFontSizes, computed['font-size']);
            // Collect layout
            this.collectValue(metrics.layoutPatterns, computed.display);
            this.collectValue(metrics.layoutPatterns, computed.position);
            this.collectValue(metrics.displayModes, computed.display);
            // Collect spacing
            this.collectValue(metrics.spacingValues, computed.margin);
            this.collectValue(metrics.spacingValues, computed.padding);
            this.collectValue(metrics.spacingValues, computed.gap);
            // Collect z-index
            const zIndex = computed['z-index'];
            if (zIndex && zIndex !== 'auto') {
                const zNum = parseInt(zIndex, 10);
                if (!isNaN(zNum)) {
                    metrics.zIndexLayers.push(zNum);
                }
            }
        }
        // Sort and deduplicate z-index layers
        metrics.zIndexLayers = [...new Set(metrics.zIndexLayers)].sort((a, b) => a - b);
        return metrics;
    }
    /**
     * Categorize styles by functional purpose.
     */
    categorizeStyles(computedStyles) {
        const categories = {
            layout: [],
            typography: [],
            color: [],
            spacing: [],
            sizing: [],
            visual: [],
            transform: [],
            other: [],
        };
        const layoutProps = ['display', 'position', 'flex', 'grid', 'float', 'clear'];
        const typographyProps = ['font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'letter-spacing'];
        const colorProps = ['color', 'background-color', 'border-color', 'outline-color'];
        const spacingProps = ['margin', 'padding', 'gap'];
        const sizingProps = ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'];
        const visualProps = ['border', 'border-radius', 'box-shadow', 'opacity', 'filter'];
        const transformProps = ['transform', 'transition', 'animation'];
        for (const style of computedStyles) {
            let categorized = false;
            const props = Object.keys(style.computed);
            if (props.some(p => layoutProps.includes(p))) {
                categories.layout.push(style);
                categorized = true;
            }
            if (props.some(p => typographyProps.includes(p))) {
                categories.typography.push(style);
                categorized = true;
            }
            if (props.some(p => colorProps.includes(p))) {
                categories.color.push(style);
                categorized = true;
            }
            if (props.some(p => spacingProps.includes(p))) {
                categories.spacing.push(style);
                categorized = true;
            }
            if (props.some(p => sizingProps.includes(p))) {
                categories.sizing.push(style);
                categorized = true;
            }
            if (props.some(p => visualProps.includes(p))) {
                categories.visual.push(style);
                categorized = true;
            }
            if (props.some(p => transformProps.includes(p))) {
                categories.transform.push(style);
                categorized = true;
            }
            if (!categorized) {
                categories.other.push(style);
            }
        }
        return categories;
    }
    /**
     * Extract design tokens from computed styles.
     * Returns normalized color, typography, spacing scales.
     */
    extractDesignTokens(metrics) {
        return {
            colors: Array.from(metrics.uniqueColors.keys()).filter(c => c && c !== 'transparent'),
            fonts: Array.from(metrics.uniqueFonts.keys()).filter(f => f && f !== 'inherit'),
            fontSizes: Array.from(metrics.uniqueFontSizes.keys()).filter(s => s && s !== 'inherit'),
            spacings: Array.from(metrics.spacingValues.keys()).filter(s => s && s !== '0px'),
        };
    }
    /**
     * Detect breakpoints from media queries.
     * Placeholder: real implementation would parse media queries from stylesheet.
     */
    detectBreakpoints(mediaQueries) {
        const breakpoints = new Set();
        for (const query of mediaQueries) {
            const match = query.match(/(\d+)px/g);
            if (match) {
                for (const m of match) {
                    const px = parseInt(m, 10);
                    if (!isNaN(px)) {
                        breakpoints.add(px);
                    }
                }
            }
        }
        return Array.from(breakpoints).sort((a, b) => a - b);
    }
    collectValue(map, value) {
        if (!value || value === 'transparent' || value === 'inherit')
            return;
        map.set(value, (map.get(value) ?? 0) + 1);
    }
}
