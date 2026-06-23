"use strict";
/**
 * projects/cic/src/pms/v2/composer.ts
 * Main PMS v2 composer and resolver.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pmsComposer = exports.PMSComposer = exports.RateLimitedIndexLookup = void 0;
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const pms_template_registry_js_1 = require("../pms.template-registry.js");
const schema_js_1 = require("./schema.js");
const inheritance_js_1 = require("./inheritance.js");
const conditional_js_1 = require("./conditional.js");
const errors_js_1 = require("./errors.js");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
class RateLimitedIndexLookup {
    constructor() {
        this.lastCall = 0;
        this.minIntervalMs = 50; // Rate limit: max 20 requests per second
    }
    async getTopNSnippets(query, limit = 3) {
        const now = Date.now();
        const elapsed = now - this.lastCall;
        if (elapsed < this.minIntervalMs) {
            await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
        }
        this.lastCall = Date.now();
        // Deterministic stub data for isolated contract/hybrid tests
        return [
            `Snippet 1: Historical records indicate Charles Sorensen arrived in Detroit in 1883.`,
            `Snippet 2: The Lellinge birth records confirm Soren Sorensen as his father.`,
            `Snippet 3: Ford Motor Company records from 1905 mention Charles Sorensen.`
        ].slice(0, limit);
    }
}
exports.RateLimitedIndexLookup = RateLimitedIndexLookup;
class PMSComposer {
    constructor(registry, indexLookup) {
        this.registry = registry || new pms_template_registry_js_1.PMSTemplateRegistry();
        this.indexLookup = indexLookup || new RateLimitedIndexLookup();
    }
    initialize() {
        if (this.registry.listAll().length === 0) {
            this.registry.load();
        }
    }
    /**
     * Resolves, inherits, conditional-evaluates, and substitutes variables.
     * Isolates template resolution errors inside the returned metadata.
     */
    async resolve(templateId, vars) {
        try {
            this.initialize();
            const rawTemplate = this.registry.get(templateId);
            if (!rawTemplate) {
                throw new errors_js_1.TemplateNotFoundError(templateId);
            }
            // 1. Schema validation
            const template = (0, schema_js_1.validateTemplateV2)(rawTemplate);
            // 2. Map all registry templates as TemplateV2
            const allTemplates = new Map();
            for (const t of this.registry.listAll()) {
                allTemplates.set(t.template_id, t);
            }
            // 3. Resolve parent inheritance and overridden blocks
            let composed = inheritance_js_1.inheritanceResolver.resolve(template, allTemplates);
            // 4. Resolve rate-limited vector index snippets: [[index_lookup query="..." limit=N]]
            const lookupRegex = /\[\[index_lookup\s+query="([^"]+)"(?:\s+limit=(\d+))?\]\]/g;
            const matches = [...composed.matchAll(lookupRegex)];
            for (const match of matches) {
                const fullMatch = match[0];
                const query = match[1];
                const limit = match[2] ? parseInt(match[2], 10) : 3;
                const snippets = await this.indexLookup.getTopNSnippets(query, limit);
                const snippetString = snippets.map((s) => `- ${s}`).join("\n");
                composed = composed.replace(fullMatch, snippetString);
            }
            // 5. Evaluate conditional blocks
            composed = conditional_js_1.conditionalEvaluator.evaluate(composed, vars);
            // 6. Perform standard variable substitutions: {variable}
            const allVars = {
                max_tokens: template.max_tokens,
                temperature: template.temperature,
                top_p: template.top_p,
                ...vars
            };
            let resolved = composed;
            for (const [key, value] of Object.entries(allVars)) {
                const regex = new RegExp(`\\{${key}\\}`, "g");
                let replacement = "";
                if (value !== undefined && value !== null) {
                    const valStr = value;
                    if (typeof valStr === "string") {
                        if ((valStr.startsWith("{") && valStr.endsWith("}")) || (valStr.startsWith("[") && valStr.endsWith("]"))) {
                            try {
                                const parsed = JSON.parse(valStr);
                                replacement = JSON.stringify(parsed, null, 2);
                            }
                            catch {
                                replacement = valStr;
                            }
                        }
                        else {
                            replacement = valStr;
                        }
                    }
                    else {
                        replacement = JSON.stringify(value, null, 2);
                    }
                }
                resolved = resolved.replace(regex, replacement);
            }
            // 7. Check for unreplaced standard variable placeholders (e.g. {variable})
            const unreplaced = resolved.match(/\{([a-zA-Z0-9_]+?)\}/g);
            if (unreplaced) {
                const varName = unreplaced[0].slice(1, -1);
                throw new errors_js_1.MissingVariableError(varName);
            }
            return {
                prompt: resolved,
                metadata: {
                    templateId: template.template_id,
                    name: template.name,
                    version: template.version,
                    extractor_type: template.extractor_type,
                    content_type: template.content_type,
                    max_tokens: template.max_tokens,
                    temperature: template.temperature,
                    top_p: template.top_p,
                    resolvedVariables: vars,
                    warnings: [],
                    error: null
                }
            };
        }
        catch (err) {
            console.error(`[PMSComposer] Error composing template '${templateId}':`, err);
            return {
                prompt: "",
                metadata: {
                    templateId,
                    resolvedVariables: vars,
                    error: err.message,
                    status: "error"
                }
            };
        }
    }
    getRegistry() {
        return this.registry;
    }
}
exports.PMSComposer = PMSComposer;
exports.pmsComposer = new PMSComposer();
//# sourceMappingURL=composer.js.map