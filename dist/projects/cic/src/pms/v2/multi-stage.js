"use strict";
/**
 * projects/cic/src/pms/v2/multi-stage.ts
 * Multi-stage prompt generation orchestrator with in-memory caching.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiStageOrchestrator = exports.MultiStageOrchestrator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const composer_js_1 = require("./composer.js");
class MultiStageOrchestrator {
    constructor() {
        // In-memory cache for composed prompts
        this.cache = new Map();
    }
    /**
     * Orchestrates prompt requests for seed, refine, and summarize stages.
     * Leverages caching to optimize repeat compositions.
     */
    async requestPrompt(stage, context) {
        const templateId = this.mapStageToTemplate(stage);
        // Build context-aware variable dictionary
        const vars = this.buildStageVariables(stage, context);
        // Compute standard SHA256 cache key
        const cacheKey = this.generateCacheKey(templateId, stage, vars);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            return {
                ...cachedResult,
                metadata: {
                    ...cachedResult.metadata,
                    cached: true
                }
            };
        }
        // Resolve the prompt using the compositional composer
        const resolved = await composer_js_1.pmsComposer.resolve(templateId, vars);
        const result = {
            prompt: resolved.prompt,
            metadata: {
                ...resolved.metadata,
                stage,
                cached: false
            }
        };
        // Store in cache only on success
        if (!resolved.metadata.error) {
            this.cache.set(cacheKey, result);
        }
        return result;
    }
    /**
     * Clear the orchestrator cache
     */
    clearCache() {
        this.cache.clear();
    }
    mapStageToTemplate(stage) {
        switch (stage) {
            case "seed":
                return "semantic_seed";
            case "refine":
                return "semantic_refine";
            case "summarize":
                return "semantic_summary";
            default:
                throw new Error(`Unsupported pipeline stage: '${stage}'`);
        }
    }
    buildStageVariables(stage, context) {
        const rawText = context.raw || "";
        const vars = {
            source: rawText,
            is_final_stage: stage === "summarize"
        };
        // Stage 2 & 3: Inject seed_output if entities exist in context
        if (stage === "refine" || stage === "summarize") {
            const entities = context.entities || [];
            vars.seed_output = JSON.stringify(entities, null, 2);
        }
        // Stage 3: Inject refine_output if relationships exist in context
        if (stage === "summarize") {
            const relationships = context.relationships || [];
            vars.refine_output = JSON.stringify(relationships, null, 2);
        }
        // Mix in arbitrary context variables, excluding non-serializable fields
        for (const [key, value] of Object.entries(context)) {
            if (key !== "raw" &&
                key !== "entities" &&
                key !== "relationships" &&
                key !== "pms" &&
                typeof value !== "function") {
                vars[key] = value;
            }
        }
        return vars;
    }
    generateCacheKey(templateId, stage, vars) {
        const hash = crypto_1.default.createHash("sha256");
        // Sort variables to ensure deterministic hash serialization
        const serializedVars = Object.keys(vars)
            .sort()
            .map((k) => `${k}:${JSON.stringify(vars[k])}`)
            .join("|");
        hash.update(`${templateId}:${stage}:${serializedVars}`);
        return hash.digest("hex");
    }
}
exports.MultiStageOrchestrator = MultiStageOrchestrator;
exports.multiStageOrchestrator = new MultiStageOrchestrator();
//# sourceMappingURL=multi-stage.js.map