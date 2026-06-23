"use strict";
/**
 * prompt-sandbox.ts
 * ARPS Phase 22.1 — Prompt Sandbox
 * Enforces immutability, ownership, and drift thresholds for system prompts.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptSandbox = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const embedding_pipeline_js_1 = require("../../indexer/embedding-pipeline.js");
class PromptSandbox {
    constructor(registryPath) {
        this.registryPath = registryPath;
        this.registry = [];
        this.embeddingPipeline = new embedding_pipeline_js_1.EmbeddingPipeline();
        this.loadRegistry();
    }
    loadRegistry() {
        if (!node_fs_1.default.existsSync(this.registryPath)) {
            throw new Error(`[PromptSandbox] Registry file not found: ${this.registryPath}`);
        }
        const content = node_fs_1.default.readFileSync(this.registryPath, "utf-8");
        const parsed = yaml_1.default.parse(content);
        if (parsed && Array.isArray(parsed.prompts)) {
            this.registry = parsed.prompts;
        }
        else {
            this.registry = [];
        }
    }
    getRegistryEntries() {
        return this.registry;
    }
    computeJaccard(textA, textB) {
        const tokenize = (t) => {
            return (t.toLowerCase().match(/\b\w+\b/g) || []);
        };
        const tokensA = tokenize(textA);
        const tokensB = tokenize(textB);
        if (tokensA.length === 0 && tokensB.length === 0)
            return 1.0;
        const setA = new Set(tokensA);
        const setB = new Set(tokensB);
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    async checkSimilarity(oldText, newText, forceFallback = false) {
        const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";
        if (forceFallback || isTest) {
            return { similarity: this.computeJaccard(oldText, newText), method: "jaccard" };
        }
        try {
            const vecA = await this.embeddingPipeline.generateEmbedding(oldText);
            const vecB = await this.embeddingPipeline.generateEmbedding(newText);
            let dot = 0;
            for (let i = 0; i < vecA.length; i++) {
                dot += vecA[i] * vecB[i];
            }
            return { similarity: dot, method: "cosine" };
        }
        catch (err) {
            return { similarity: this.computeJaccard(oldText, newText), method: "jaccard" };
        }
    }
    async validateChange(entry, oldText, newText, options) {
        // 1. Enforce ownership rules
        if (entry.owner !== options.owner) {
            return {
                allowed: false,
                reason: `Ownership mismatch: prompt is owned by '${entry.owner}', requested by '${options.owner}'`
            };
        }
        // 2. Compute similarity
        const { similarity, method } = await this.checkSimilarity(oldText, newText, options.forceFallback);
        // 3. Enforce thresholds
        const minThreshold = method === "cosine" ? entry.min_similarity : 0.85;
        if (similarity < minThreshold) {
            return {
                allowed: false,
                reason: `Drift violation: computed similarity ${similarity.toFixed(4)} (${method}) is below threshold ${minThreshold}`,
                similarity,
                method
            };
        }
        return {
            allowed: true,
            reason: `Authorized: prompt matches threshold check (${method})`,
            similarity,
            method
        };
    }
    async check(promptId, newContent, options) {
        const entry = this.registry.find(e => e.id === promptId);
        if (!entry) {
            return { allowed: false, reason: `Prompt ID '${promptId}' is not registered` };
        }
        const resolvedPath = node_path_1.default.resolve(node_path_1.default.dirname(this.registryPath), entry.path);
        if (!node_fs_1.default.existsSync(resolvedPath)) {
            // If the file doesn't exist yet, it's a new prompt, allowed if requester is owner
            if (entry.owner !== options.owner) {
                return {
                    allowed: false,
                    reason: `Cannot initialize new prompt: owner mismatch (expected '${entry.owner}', got '${options.owner}')`
                };
            }
            return { allowed: true, reason: `Authorized: prompt initialization approved` };
        }
        const oldText = node_fs_1.default.readFileSync(resolvedPath, "utf-8");
        return this.validateChange(entry, oldText, newContent, options);
    }
}
exports.PromptSandbox = PromptSandbox;
//# sourceMappingURL=prompt-sandbox.js.map