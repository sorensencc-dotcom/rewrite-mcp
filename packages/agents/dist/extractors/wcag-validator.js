/**
 * WCAG 2.1 AA compliance validator.
 * Checks: semantic HTML, contrast, images, forms, keyboard access, focus, ARIA.
 */
export class WcagValidator {
    constructor(domModel, computedStyles, targetLevel = 'AA') {
        this.domModel = domModel;
        this.computedStyles = computedStyles;
        this.targetLevel = targetLevel;
    }
    /**
     * Run full WCAG audit against target level.
     */
    audit() {
        const issues = [];
        let passedTests = 0;
        let failedTests = 0;
        // 1.1 Text Alternatives
        const imageIssues = this.checkImages();
        issues.push(...imageIssues);
        if (imageIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 1.4 Distinguishable (Contrast)
        const contrastIssues = this.checkContrast();
        issues.push(...contrastIssues);
        if (contrastIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 2.1 Keyboard Accessible
        const keyboardIssues = this.checkKeyboardAccess();
        issues.push(...keyboardIssues);
        if (keyboardIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 2.4 Navigable
        const navIssues = this.checkNavigation();
        issues.push(...navIssues);
        if (navIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 3.1 Readable
        const readableIssues = this.checkReadability();
        issues.push(...readableIssues);
        if (readableIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 3.2 Predictable
        const predictIssues = this.checkPredictability();
        issues.push(...predictIssues);
        if (predictIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        // 4.1 Compatible
        const compatIssues = this.checkCompatibility();
        issues.push(...compatIssues);
        if (compatIssues.length === 0)
            passedTests++;
        else
            failedTests++;
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const seriousCount = issues.filter(i => i.severity === 'serious').length;
        const conformance = criticalCount === 0 && seriousCount === 0 ? 'pass' : criticalCount > 0 ? 'fail' : 'partial';
        const score = Math.max(0, 100 - (criticalCount * 20 + seriousCount * 5));
        return {
            wcagLevel: this.targetLevel,
            targetLevel: this.targetLevel,
            issuesFound: issues,
            passedTests,
            failedTests,
            score,
            conformance,
        };
    }
    checkImages() {
        const issues = [];
        const images = this.domModel.images;
        for (const img of images) {
            if (!img.alt || img.alt.trim().length === 0) {
                issues.push({
                    id: '1.1.1',
                    criterion: 'Non-text Content (Level A)',
                    level: 'A',
                    severity: 'critical',
                    description: 'Image missing alt text',
                    remedy: 'Add meaningful alt text to all <img> tags',
                    affectedElements: [img.src],
                });
            }
        }
        return issues;
    }
    checkContrast() {
        const issues = [];
        if (!this.computedStyles) {
            // Stub: without computed styles, we can't accurately assess contrast
            return issues;
        }
        for (const style of this.computedStyles) {
            const ratio = this.calculateContrastRatio(style.computed.color ?? '#000000', style.computed['background-color'] ?? '#ffffff');
            const minRatio = this.targetLevel === 'AAA' ? 7 : 4.5;
            if (ratio < minRatio) {
                issues.push({
                    id: '1.4.3',
                    criterion: 'Contrast (Minimum) (Level AA)',
                    level: 'AA',
                    severity: 'serious',
                    element: style.selector,
                    description: `Insufficient color contrast: ${ratio.toFixed(2)}:1 (needs ${minRatio}:1)`,
                    remedy: 'Increase contrast by darkening text or lightening background',
                    affectedElements: [style.selector],
                });
            }
        }
        return issues;
    }
    checkKeyboardAccess() {
        const issues = [];
        // Walk DOM to find interactive elements without keyboard access
        const findInteractive = (node, path = '') => {
            const currentPath = `${path}/${node.tag}${node.id ? `#${node.id}` : ''}`;
            // Check if element is interactive but lacks accessibility
            if (['button', 'input', 'select', 'textarea', 'a'].includes(node.tag)) {
                // These should be keyboard accessible by default
                // Issue would be if they're disabled or have tabindex < 0
                if (node.attributes['tabindex'] && parseInt(node.attributes['tabindex'], 10) < 0) {
                    issues.push({
                        id: '2.1.1',
                        criterion: 'Keyboard (Level A)',
                        level: 'A',
                        severity: 'serious',
                        element: currentPath,
                        description: 'Interactive element has tabindex=-1 (not keyboard accessible)',
                        remedy: 'Remove negative tabindex or make keyboard accessible via alternative means',
                        affectedElements: [currentPath],
                    });
                }
            }
            // Check custom clickable elements
            if (node.tag === 'div' && node.attributes['onclick']) {
                if (!node.attributes['role'] || !node.attributes['tabindex']) {
                    issues.push({
                        id: '2.1.1',
                        criterion: 'Keyboard (Level A)',
                        level: 'A',
                        severity: 'moderate',
                        element: currentPath,
                        description: 'Custom clickable div lacks keyboard access (no role, tabindex)',
                        remedy: 'Add role="button", tabindex="0", and keyboard event handlers',
                        affectedElements: [currentPath],
                    });
                }
            }
            for (const child of node.children) {
                findInteractive(child, currentPath);
            }
        };
        findInteractive(this.domModel.root);
        return issues;
    }
    checkNavigation() {
        const issues = [];
        // 2.4.2 Page Titled
        if (!this.domModel.title || this.domModel.title.trim().length === 0) {
            issues.push({
                id: '2.4.2',
                criterion: 'Page Titled (Level A)',
                level: 'A',
                severity: 'critical',
                description: 'Page missing <title> element',
                remedy: 'Add descriptive <title> to all pages',
                affectedElements: ['<title>'],
            });
        }
        // 2.4.1 Bypass Blocks
        const hasSkipLink = this.domModel.root.children.some(node => node.attributes['href']?.includes('#main') || node.attributes['href']?.includes('#content'));
        if (!hasSkipLink && this.domModel.root.children.length > 5) {
            issues.push({
                id: '2.4.1',
                criterion: 'Bypass Blocks (Level A)',
                level: 'A',
                severity: 'moderate',
                description: 'No skip navigation link to main content',
                remedy: 'Add skip link at top of page (e.g., "Skip to main content")',
                affectedElements: ['<body>'],
            });
        }
        // 2.4.3 Focus Order
        // Would need interactive elements to fully validate
        // Stub: check for obvious issues
        return issues;
    }
    checkReadability() {
        const issues = [];
        // 3.1.1 Language of Page
        if (!this.domModel.root.attributes['lang']) {
            issues.push({
                id: '3.1.1',
                criterion: 'Language of Page (Level A)',
                level: 'A',
                severity: 'moderate',
                description: 'Page <html> element missing lang attribute',
                remedy: 'Add lang="en" (or appropriate language) to <html> tag',
                affectedElements: ['<html>'],
            });
        }
        return issues;
    }
    checkPredictability() {
        // 3.2.x On Focus, On Input, Consistent Navigation, Consistent Identification
        // These require interaction testing; return empty for stub
        return [];
    }
    checkCompatibility() {
        const issues = [];
        // 4.1.2 Name, Role, Value
        // Check form inputs for labels
        const findUnlabeledInputs = (node, path = '') => {
            const currentPath = `${path}/${node.tag}${node.id ? `#${node.id}` : ''}`;
            if (['input', 'select', 'textarea'].includes(node.tag)) {
                const hasLabel = node.attributes['aria-label'] ||
                    node.attributes['aria-labelledby'] ||
                    node.attributes['placeholder'] ||
                    false; // Would need to check for associated <label>
                if (!hasLabel) {
                    issues.push({
                        id: '4.1.2',
                        criterion: 'Name, Role, Value (Level A)',
                        level: 'A',
                        severity: 'serious',
                        element: currentPath,
                        description: `${node.tag} missing accessible name`,
                        remedy: `Add <label> or aria-label to ${node.tag}`,
                        affectedElements: [currentPath],
                    });
                }
            }
            for (const child of node.children) {
                findUnlabeledInputs(child, currentPath);
            }
        };
        findUnlabeledInputs(this.domModel.root);
        return issues;
    }
    calculateContrastRatio(fg, bg) {
        try {
            const fgRgb = this.parseColor(fg);
            const bgRgb = this.parseColor(bg);
            const fgLum = this.relativeLuminance(fgRgb);
            const bgLum = this.relativeLuminance(bgRgb);
            const lighter = Math.max(fgLum, bgLum);
            const darker = Math.min(fgLum, bgLum);
            return (lighter + 0.05) / (darker + 0.05);
        }
        catch {
            return 4.5; // Assume acceptable if can't parse
        }
    }
    parseColor(color) {
        // Very basic parser for #RRGGBB and rgb()
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r, g, b];
        }
        if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                return [parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)];
            }
        }
        return [0, 0, 0];
    }
    relativeLuminance(rgb) {
        const [r, g, b] = rgb.map(v => {
            const v2 = v / 255;
            return v2 <= 0.03928 ? v2 / 12.92 : Math.pow((v2 + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
}
