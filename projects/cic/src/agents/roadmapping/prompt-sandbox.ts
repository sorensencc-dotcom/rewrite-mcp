/**
 * prompt-sandbox.ts
 * ARPS Phase 22.1 — Prompt Sandbox
 * Enforces immutability, ownership, and drift thresholds for system prompts.
 */

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { EmbeddingPipeline } from "../../indexer/embedding-pipeline.js";

export interface SandboxDecision {
  allowed: boolean;
  reason: string;
  similarity?: number;
  method?: "cosine" | "jaccard";
}

export interface PromptRegistryEntry {
  id: string;
  path: string;
  owner: string;
  min_similarity: number;
}

export class PromptSandbox {
  private registry: PromptRegistryEntry[] = [];
  private embeddingPipeline = new EmbeddingPipeline();

  constructor(private registryPath: string) {
    this.loadRegistry();
  }

  loadRegistry(): void {
    if (!fs.existsSync(this.registryPath)) {
      throw new Error(`[PromptSandbox] Registry file not found: ${this.registryPath}`);
    }
    const content = fs.readFileSync(this.registryPath, "utf-8");
    const parsed = YAML.parse(content);
    if (parsed && Array.isArray(parsed.prompts)) {
      this.registry = parsed.prompts;
    } else {
      this.registry = [];
    }
  }

  getRegistryEntries(): PromptRegistryEntry[] {
    return this.registry;
  }

  computeJaccard(textA: string, textB: string): number {
    const tokenize = (t: string) => {
      return (t.toLowerCase().match(/\b\w+\b/g) || []);
    };
    const tokensA = tokenize(textA);
    const tokensB = tokenize(textB);
    if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
    
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  async checkSimilarity(
    oldText: string,
    newText: string,
    forceFallback = false
  ): Promise<{ similarity: number; method: "cosine" | "jaccard" }> {
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
    } catch (err) {
      return { similarity: this.computeJaccard(oldText, newText), method: "jaccard" };
    }
  }

  async validateChange(
    entry: PromptRegistryEntry,
    oldText: string,
    newText: string,
    options: { owner: string; forceFallback?: boolean }
  ): Promise<SandboxDecision> {
    // 1. Enforce ownership rules
    if (entry.owner !== options.owner) {
      return {
        allowed: false,
        reason: `Ownership mismatch: prompt is owned by '${entry.owner}', requested by '${options.owner}'`
      };
    }

    // 2. Compute similarity
    const { similarity, method } = await this.checkSimilarity(
      oldText,
      newText,
      options.forceFallback
    );

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

  async check(
    promptId: string,
    newContent: string,
    options: { owner: string; forceFallback?: boolean }
  ): Promise<SandboxDecision> {
    const entry = this.registry.find(e => e.id === promptId);
    if (!entry) {
      return { allowed: false, reason: `Prompt ID '${promptId}' is not registered` };
    }

    const resolvedPath = path.resolve(path.dirname(this.registryPath), entry.path);
    if (!fs.existsSync(resolvedPath)) {
      // If the file doesn't exist yet, it's a new prompt, allowed if requester is owner
      if (entry.owner !== options.owner) {
        return {
          allowed: false,
          reason: `Cannot initialize new prompt: owner mismatch (expected '${entry.owner}', got '${options.owner}')`
        };
      }
      return { allowed: true, reason: `Authorized: prompt initialization approved` };
    }

    const oldText = fs.readFileSync(resolvedPath, "utf-8");
    return this.validateChange(entry, oldText, newContent, options);
  }
}
