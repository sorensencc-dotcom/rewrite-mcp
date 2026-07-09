import Anthropic from '@anthropic-ai/sdk';

export const REDESIGN_VERSION = '1.0.0';

export class RedesignNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedesignNotConfiguredError';
    Object.setPrototypeOf(this, RedesignNotConfiguredError.prototype);
  }
}

export interface DesignVariant {
  variantId: string;
  variantName: string;
  html: string;
  css: string;
  tokenDriftScore: number;
  w3cValid: boolean;
  w3cErrors: string[];
  generatedAt: string;
}

export interface RedesignInput {
  url: string;
  namespace?: string; // Mapped client namespace (optional)
  title?: string;
  designTokens?: Record<string, string>;
  computedStylesSummary?: string;
  interactiveElementCount?: number;
  performanceMs?: number;
  variantCount?: number;
}

export interface RedesignOutput {
  variants: DesignVariant[];
  sourceUrl: string;
  passesCompleted: number;
  generationTimeMs: number;
  generatedAt: string;
  notebooklm_partial_results?: boolean;
  notebooklm_error_code?: string;
}

export class TokenDriftHaltError extends Error {
  constructor(public driftScore: number, public mismatchedTokens: Record<string, { expected: string; found: string }>) {
    super(`Variant generation halted due to high token drift: ${driftScore.toFixed(4)} (limit: 0.15)`);
    this.name = 'TokenDriftHaltError';
    Object.setPrototypeOf(this, TokenDriftHaltError.prototype);
  }
}

export class ValidationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationTimeoutError';
    Object.setPrototypeOf(this, ValidationTimeoutError.prototype);
  }
}

interface StructureAnalysis {
  layoutType: string;
  colorScheme: string;
  typographyHierarchy: string;
  interactionDensity: string;
  modernizationTargets: string[];
  redesignBrief: string;
}

interface CssLayout {
  customProps: string;
  baseCSS: string;
}

interface RawVariant {
  name: string;
  html: string;
  css: string;
}

type AnthropicMessage = {
  content: Array<{ type: string; text?: string }>;
};

export class RedesignAgent {
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly injectedClient?: Anthropic;
  private readonly torqueUrl: string;

  constructor(options: { model?: string; maxTokens?: number; client?: Anthropic; torqueUrl?: string } = {}) {
    this.model = options.model ?? 'claude-haiku-4-5-20251001';
    this.maxTokens = options.maxTokens ?? 4096;
    this.injectedClient = options.client;
    this.torqueUrl = options.torqueUrl ?? 'http://localhost:8000';
  }

  async redesign(input: RedesignInput): Promise<RedesignOutput> {
    const client = this.injectedClient ?? (() => {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new RedesignNotConfiguredError(
          'ANTHROPIC_API_KEY not set — required for 3-pass LLM redesign chain'
        );
      }
      return new Anthropic({ apiKey });
    })();
    const startTime = Date.now();
    const variantCount = input.variantCount ?? 3;

    // 1. Fetch federated context from TorqueQuery if namespace is provided
    let federatedTokens = { ...input.designTokens };
    let federatedBrief = '';
    let notebooklm_partial_results = false;
    let notebooklm_error_code: string | undefined;

    if (input.namespace) {
      try {
        const fetchFn = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default as any;
        const response = await fetchFn(`${this.torqueUrl}/search/federated`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'brand design guidelines colors fonts stylesheet',
            namespaces: [input.namespace],
            limit: 5,
            options: {
              rrf_constant: 60,
              include_notebooklm: true,
              notebooklm_weight: 1.0
            }
          })
        });

        if (response.ok) {
          const data = await response.json() as { results?: any[]; notebooklm_partial_results?: boolean; notebooklm_error_code?: string };
          if (data.notebooklm_partial_results) {
            notebooklm_partial_results = true;
            notebooklm_error_code = data.notebooklm_error_code;
          }
          // Extract text bodies to assemble style guides
          if (data.results && data.results.length > 0) {
            const fusedText = data.results.map(r => r.body).join('\n\n');
            federatedBrief = `Federated NotebookLM Context:\n${fusedText}\n`;
            
            // Regex parse key-value tokens from notebook text: --name: value
            const tokenRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g;
            let match;
            while ((match = tokenRegex.exec(fusedText)) !== null) {
              const key = match[1].trim();
              const val = match[2].trim();
              if (key && val) {
                federatedTokens[key] = val;
              }
            }
          }
        } else {
          // Non-blocking cascade fallback
          notebooklm_partial_results = true;
          notebooklm_error_code = 'HTTP_ERROR';
        }
      } catch (err) {
        // Fallback to local
        notebooklm_partial_results = true;
        notebooklm_error_code = 'TIMEOUT_OR_NETWORK_ERROR';
      }
    }

    // Combine local designTokens with extracted federatedTokens
    const resolvedTokens = { ...input.designTokens, ...federatedTokens };

    // Inject federated context into inputs for passStructureAnalysis
    const enrichedInput = {
      ...input,
      designTokens: resolvedTokens,
      computedStylesSummary: input.computedStylesSummary 
        ? `${input.computedStylesSummary}\n\n${federatedBrief}` 
        : federatedBrief || undefined
    };

    const structure = await this.passStructureAnalysis(client, enrichedInput);
    const cssLayout = await this.passCssLayout(client, enrichedInput, structure);
    const rawVariants = await this.passVariantGeneration(client, enrichedInput, structure, cssLayout, variantCount);

    const variants: DesignVariant[] = [];
    for (let i = 0; i < rawVariants.length; i++) {
      const v = rawVariants[i];
      const validationStart = Date.now();

      // Enforce the 200ms validation budget gate
      const w3c = this.validateW3C(v.html);
      const drift = this.calculateTokenDrift(resolvedTokens, v.css);
      
      const validationDuration = Date.now() - validationStart;
      if (validationDuration > 200) {
        // Abort and halt execution on timeout gate violation
        const timeoutErr = new ValidationTimeoutError(`Validation exceeded latency budget: ${validationDuration}ms (limit: 200ms)`);
        console.error(`[Token Validation] ${timeoutErr.message}`);
        // Log diagnostic JSON to tq-error.log would go here.
        throw timeoutErr;
      }

      // Check drift limit (0.15)
      if (drift > 0.15) {
        const mismatched: Record<string, { expected: string; found: string }> = {};
        for (const [key, expected] of Object.entries(resolvedTokens)) {
          const match = new RegExp(`--${key.replace(/\./g, '-')}\\s*:\\s*([^;]+);`).exec(v.css);
          const found = match ? match[1].trim() : '(missing)';
          if (found === '(missing)' || this.normalizeColor(found) !== this.normalizeColor(expected)) {
            mismatched[key] = { expected, found };
          }
        }
        const driftErr = new TokenDriftHaltError(drift, mismatched);
        console.error(`[Token Validation] ${driftErr.message}`);
        throw driftErr;
      }

      variants.push({
        variantId: `variant-${i + 1}`,
        variantName: v.name,
        html: v.html,
        css: v.css,
        tokenDriftScore: drift,
        w3cValid: w3c.valid,
        w3cErrors: w3c.errors,
        generatedAt: new Date().toISOString(),
      });
    }

    const output: RedesignOutput = {
      variants,
      sourceUrl: input.url,
      passesCompleted: 3,
      generationTimeMs: Date.now() - startTime,
      generatedAt: new Date().toISOString(),
    };

    if (notebooklm_partial_results) {
      output.notebooklm_partial_results = true;
      output.notebooklm_error_code = notebooklm_error_code;
    }

    return output;
  }

  private async passStructureAnalysis(
    client: Anthropic,
    input: RedesignInput
  ): Promise<StructureAnalysis> {
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
      system:
        'You are a web redesign analyst. Return ONLY valid JSON — no markdown, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Analyze this website and return a JSON structure analysis.\n\n${lines}\n\nReturn ONLY:\n{"layoutType":"single-column|multi-column|grid|hero-focused|dashboard","colorScheme":"light|dark|minimal|bold","typographyHierarchy":"minimal|standard|rich","interactionDensity":"low|medium|high","modernizationTargets":["string"],"redesignBrief":"2-3 sentence redesign opportunity"}`,
        },
      ],
    });

    return this.parseJSON<StructureAnalysis>(response as AnthropicMessage, {
      layoutType: 'single-column',
      colorScheme: 'light',
      typographyHierarchy: 'standard',
      interactionDensity: 'medium',
      modernizationTargets: [],
      redesignBrief: 'Modern redesign opportunity.',
    });
  }

  private async passCssLayout(
    client: Anthropic,
    input: RedesignInput,
    structure: StructureAnalysis
  ): Promise<CssLayout> {
    const tokens = input.designTokens ?? {};
    const tokenLines =
      Object.entries(tokens)
        .map(([k, v]) => `  --${k.replace(/\./g, '-')}: ${v};`)
        .join('\n') || '  /* no source tokens — generate sensible defaults */';

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system:
        'You are a CSS architect. Return ONLY valid JSON with CSS in string values. Escape newlines as \\n in JSON strings.',
      messages: [
        {
          role: 'user',
          content: `Generate CSS custom properties and base layout for a ${structure.layoutType} ${structure.colorScheme} design.\n\nBrief: ${structure.redesignBrief}\nModernize: ${structure.modernizationTargets.join(', ')}\n\nSource tokens:\n${tokenLines}\n\nReturn ONLY:\n{"customProps":":root {\\n  --color-primary: ...;\\n}","baseCSS":"*, *::before, *::after { box-sizing: border-box; }\\nbody { ... }"}`,
        },
      ],
    });

    return this.parseJSON<CssLayout>(response as AnthropicMessage, {
      customProps: ':root { --color-primary: #007bff; --font-base: "Inter, sans-serif"; }',
      baseCSS:
        '*, *::before, *::after { box-sizing: border-box; } body { margin: 0; font-family: var(--font-base); }',
    });
  }

  private async passVariantGeneration(
    client: Anthropic,
    input: RedesignInput,
    structure: StructureAnalysis,
    cssLayout: CssLayout,
    variantCount: number
  ): Promise<RawVariant[]> {
    const title = input.title ?? 'Redesigned Site';
    const names = ['Minimal', 'Bold', 'Editorial', 'Modern', 'Classic'].slice(0, variantCount);

    const response = await client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system:
        'You are a web designer generating complete HTML/CSS design variants. Return ONLY valid JSON.',
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

    const parsed = this.parseJSON<{ variants: RawVariant[] }>(response as AnthropicMessage, {
      variants: [],
    });
    return parsed.variants.slice(0, variantCount);
  }

  private parseJSON<T>(response: AnthropicMessage, fallback: T): T {
    try {
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }

  validateW3C(html: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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

  normalizeColor(color: string): string {
    const clean = color.trim().toLowerCase().replace(/\s+/g, '');
    
    // Hex shorthand translation: #fff -> #ffffff
    if (clean.startsWith('#')) {
      if (clean.length === 4) {
        return '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
      }
      return clean;
    }

    // RGB/RGBA translation
    if (clean.startsWith('rgb')) {
      const match = /rgba?\((\d+),(\d+),(\d+)(?:,[\d.]+)?\)/.exec(clean);
      if (match) {
        const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }

    // HSL/HSLA translation (simplified translation to preserve consistency)
    if (clean.startsWith('hsl')) {
      const match = /hsla?\((\d+),(\d+)%,(\d+)%(?:,[\d.]+)?\)/.exec(clean);
      if (match) {
        const h = parseInt(match[1], 10) / 360;
        const s = parseInt(match[2], 10) / 100;
        const l = parseInt(match[3], 10) / 100;
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        const rh = Math.round(r * 255).toString(16).padStart(2, '0');
        const gh = Math.round(g * 255).toString(16).padStart(2, '0');
        const bh = Math.round(b * 255).toString(16).padStart(2, '0');
        return `#${rh}${gh}${bh}`;
      }
    }

    return clean;
  }

  calculateTokenDrift(sourceTokens: Record<string, string>, generatedCSS: string): number {
    const entries = Object.entries(sourceTokens);
    if (entries.length === 0) return 0;

    let penalties = 0;
    for (const [key, value] of entries) {
      const safeKey = key.replace(/\./g, '-');
      // 1. First try matching custom property --key: value;
      const valPattern = new RegExp(`--${safeKey}\\s*:\\s*([^;]+);`);
      const match = valPattern.exec(generatedCSS);

      if (match) {
        const foundVal = match[1].trim();
        const expectedNormalized = this.normalizeColor(value);
        const foundNormalized = this.normalizeColor(foundVal);
        if (expectedNormalized !== foundNormalized) {
          penalties += 1.0; // Value is mismatched
        }
      } else {
        // 2. Sibling/legacy fallback: check if value appears in generatedCSS as a raw substring (e.g. `color: #007bff`)
        if (value && generatedCSS.includes(value)) {
          // Found as raw substring, no penalty
        } else {
          penalties += 1.0; // Token is missing entirely
        }
      }
    }

    return parseFloat((penalties / entries.length).toFixed(4));
  }
}
