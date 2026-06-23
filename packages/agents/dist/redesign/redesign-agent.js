import Anthropic from '@anthropic-ai/sdk';
export const REDESIGN_VERSION = '1.0.0';
export class RedesignNotConfiguredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RedesignNotConfiguredError';
        Object.setPrototypeOf(this, RedesignNotConfiguredError.prototype);
    }
}
export class RedesignAgent {
    constructor(options = {}) {
        this.model = options.model ?? 'claude-haiku-4-5-20251001';
        this.maxTokens = options.maxTokens ?? 4096;
    }
    async redesign(input) {
        const apiKey = process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            throw new RedesignNotConfiguredError('ANTHROPIC_API_KEY not set — required for 3-pass LLM redesign chain');
        }
        const client = new Anthropic({ apiKey });
        const startTime = Date.now();
        const variantCount = input.variantCount ?? 3;
        const structure = await this.passStructureAnalysis(client, input);
        const cssLayout = await this.passCssLayout(client, input, structure);
        const rawVariants = await this.passVariantGeneration(client, input, structure, cssLayout, variantCount);
        const sourceTokens = input.designTokens ?? {};
        const variants = rawVariants.map((v, i) => {
            const w3c = this.validateW3C(v.html);
            const drift = this.calculateTokenDrift(sourceTokens, v.css);
            return {
                variantId: `variant-${i + 1}`,
                variantName: v.name,
                html: v.html,
                css: v.css,
                tokenDriftScore: drift,
                w3cValid: w3c.valid,
                w3cErrors: w3c.errors,
                generatedAt: new Date().toISOString(),
            };
        });
        return {
            variants,
            sourceUrl: input.url,
            passesCompleted: 3,
            generationTimeMs: Date.now() - startTime,
            generatedAt: new Date().toISOString(),
        };
    }
    async passStructureAnalysis(client, input) {
        const lines = [
            `URL: ${input.url}`,
            `Title: ${input.title ?? 'Unknown'}`,
            input.computedStylesSummary ? `Key Styles:\n${input.computedStylesSummary}` : null,
            input.interactiveElementCount !== undefined
                ? `Interactive Elements: ${input.interactiveElementCount}`
                : null,
            input.performanceMs !== undefined ? `Page Load: ${input.performanceMs}ms` : null,
        ]
            .filter(Boolean)
            .join('\n');
        const response = await client.messages.create({
            model: this.model,
            max_tokens: 512,
            system: 'You are a web redesign analyst. Return ONLY valid JSON — no markdown, no explanation.',
            messages: [
                {
                    role: 'user',
                    content: `Analyze this website and return a JSON structure analysis.\n\n${lines}\n\nReturn ONLY:\n{"layoutType":"single-column|multi-column|grid|hero-focused|dashboard","colorScheme":"light|dark|minimal|bold","typographyHierarchy":"minimal|standard|rich","interactionDensity":"low|medium|high","modernizationTargets":["string"],"redesignBrief":"2-3 sentence redesign opportunity"}`,
                },
            ],
        });
        return this.parseJSON(response, {
            layoutType: 'single-column',
            colorScheme: 'light',
            typographyHierarchy: 'standard',
            interactionDensity: 'medium',
            modernizationTargets: [],
            redesignBrief: 'Modern redesign opportunity.',
        });
    }
    async passCssLayout(client, input, structure) {
        const tokens = input.designTokens ?? {};
        const tokenLines = Object.entries(tokens)
            .map(([k, v]) => `  --${k.replace(/\./g, '-')}: ${v};`)
            .join('\n') || '  /* no source tokens — generate sensible defaults */';
        const response = await client.messages.create({
            model: this.model,
            max_tokens: 1024,
            system: 'You are a CSS architect. Return ONLY valid JSON with CSS in string values. Escape newlines as \\n in JSON strings.',
            messages: [
                {
                    role: 'user',
                    content: `Generate CSS custom properties and base layout for a ${structure.layoutType} ${structure.colorScheme} design.\n\nBrief: ${structure.redesignBrief}\nModernize: ${structure.modernizationTargets.join(', ')}\n\nSource tokens:\n${tokenLines}\n\nReturn ONLY:\n{"customProps":":root {\\n  --color-primary: ...;\\n}","baseCSS":"*, *::before, *::after { box-sizing: border-box; }\\nbody { ... }"}`,
                },
            ],
        });
        return this.parseJSON(response, {
            customProps: ':root { --color-primary: #007bff; --font-base: "Inter, sans-serif"; }',
            baseCSS: '*, *::before, *::after { box-sizing: border-box; } body { margin: 0; font-family: var(--font-base); }',
        });
    }
    async passVariantGeneration(client, input, structure, cssLayout, variantCount) {
        const title = input.title ?? 'Redesigned Site';
        const names = ['Minimal', 'Bold', 'Editorial', 'Modern', 'Classic'].slice(0, variantCount);
        const response = await client.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            system: 'You are a web designer generating complete HTML/CSS design variants. Return ONLY valid JSON.',
            messages: [
                {
                    role: 'user',
                    content: [
                        `Create ${variantCount} distinct HTML design variants for: ${title}`,
                        `Brief: ${structure.redesignBrief}`,
                        `Layout: ${structure.layoutType}`,
                        '',
                        'CSS Custom Properties:',
                        cssLayout.customProps,
                        '',
                        'Base CSS:',
                        cssLayout.baseCSS,
                        '',
                        'Each variant must include: <!DOCTYPE html>, <html lang="en">, <head> with <meta charset="UTF-8"> and <title>, semantic HTML5, use CSS custom properties.',
                        `Variant names: ${names.join(', ')}`,
                        '',
                        `Return ONLY:\n{"variants":[{"name":"Minimal","html":"<!DOCTYPE html>...","css":"/* css */"},...]}`,
                    ].join('\n'),
                },
            ],
        });
        const parsed = this.parseJSON(response, {
            variants: [],
        });
        return parsed.variants.slice(0, variantCount);
    }
    parseJSON(response, fallback) {
        try {
            const text = response.content
                .filter((b) => b.type === 'text')
                .map((b) => b.text ?? '')
                .join('');
            const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
            return JSON.parse(cleaned);
        }
        catch {
            return fallback;
        }
    }
    validateW3C(html) {
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
        return { valid: errors.length === 0, errors };
    }
    calculateTokenDrift(sourceTokens, generatedCSS) {
        const entries = Object.entries(sourceTokens);
        if (entries.length === 0)
            return 0;
        let usedCount = 0;
        for (const [, value] of entries) {
            if (value && generatedCSS.includes(value))
                usedCount++;
        }
        return parseFloat((1 - usedCount / entries.length).toFixed(4));
    }
}
