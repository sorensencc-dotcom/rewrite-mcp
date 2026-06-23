export class DesignVariantRenderer {
    render(variant, options = {}) {
        const { sourceTokens = {}, strictW3C = false } = options;
        const w3cResult = this.validateW3C(variant.html, strictW3C);
        const tokenDriftScore = this.calculateTokenDrift(sourceTokens, variant.css);
        return {
            ...variant,
            tokenDriftScore,
            w3cValid: w3cResult.valid,
            w3cErrors: w3cResult.errors,
            renderedAt: new Date().toISOString(),
        };
    }
    renderAll(variants, options = {}, driftThreshold = 0.15) {
        const rendered = variants.map((v) => this.render(v, options));
        const maxTokenDrift = Math.max(...rendered.map((v) => v.tokenDriftScore), 0);
        return {
            variants: rendered,
            allW3CValid: rendered.every((v) => v.w3cValid),
            maxTokenDrift,
            meetsThreshold: maxTokenDrift <= driftThreshold,
            threshold: driftThreshold,
        };
    }
    validateW3C(html, strict = false) {
        const errors = [];
        if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
            errors.push('Missing DOCTYPE declaration');
        }
        if (!/<html[^>]+lang=["'][^"']*["']/.test(html)) {
            errors.push('Missing or empty lang attribute on <html>');
        }
        if (!/<title>[^<]*<\/title>/.test(html)) {
            errors.push('Missing <title> element');
        }
        if (!/<meta[^>]+charset/.test(html)) {
            errors.push('Missing charset <meta> declaration');
        }
        if (!/<head[\s>]/.test(html) && !html.includes('<head>')) {
            errors.push('Missing <head> element');
        }
        if (!/<body[\s>]/.test(html) && !html.includes('<body>')) {
            errors.push('Missing <body> element');
        }
        if (strict) {
            if (!/<meta[^>]+viewport/.test(html)) {
                errors.push('Missing viewport <meta> tag (strict)');
            }
            if (!/<html[^>]+lang=["'][a-z]{2,}/.test(html)) {
                errors.push('lang attribute must be a valid language code (strict)');
            }
        }
        return { valid: errors.length === 0, errors };
    }
    calculateTokenDrift(sourceTokens, generatedCSS) {
        const entries = Object.entries(sourceTokens).filter(([, v]) => Boolean(v));
        if (entries.length === 0)
            return 0;
        let usedCount = 0;
        for (const [, value] of entries) {
            if (generatedCSS.includes(value))
                usedCount++;
        }
        return parseFloat((1 - usedCount / entries.length).toFixed(4));
    }
}
