/**
 * projects/cic/src/pms/v2/multi-stage.ts
 * Multi-stage prompt generation orchestrator with in-memory caching.
 */

import crypto from "crypto";
import { pmsComposer } from "./composer.js";

export type StageType = "seed" | "refine" | "summarize";

export interface MultiStageResult {
  prompt: string;
  metadata: {
    templateId: string;
    stage: StageType;
    cached: boolean;
    resolvedVariables: Record<string, any>;
    error: string | null;
    [key: string]: any;
  };
}

export class MultiStageOrchestrator {
  // In-memory cache for composed prompts
  private cache: Map<string, MultiStageResult> = new Map();

  /**
   * Orchestrates prompt requests for seed, refine, and summarize stages.
   * Leverages caching to optimize repeat compositions.
   */
  async requestPrompt(stage: StageType, context: any): Promise<MultiStageResult> {
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
    const resolved = await pmsComposer.resolve(templateId, vars);

    const result: MultiStageResult = {
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
  clearCache(): void {
    this.cache.clear();
  }

  private mapStageToTemplate(stage: StageType): string {
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

  private buildStageVariables(stage: StageType, context: any): Record<string, any> {
    const rawText = context.raw || "";

    const vars: Record<string, any> = {
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
      if (
        key !== "raw" &&
        key !== "entities" &&
        key !== "relationships" &&
        key !== "pms" &&
        typeof value !== "function"
      ) {
        vars[key] = value;
      }
    }

    return vars;
  }

  private generateCacheKey(templateId: string, stage: string, vars: Record<string, any>): string {
    const hash = crypto.createHash("sha256");
    // Sort variables to ensure deterministic hash serialization
    const serializedVars = Object.keys(vars)
      .sort()
      .map((k) => `${k}:${JSON.stringify(vars[k])}`)
      .join("|");

    hash.update(`${templateId}:${stage}:${serializedVars}`);
    return hash.digest("hex");
  }
}
export const multiStageOrchestrator = new MultiStageOrchestrator();
