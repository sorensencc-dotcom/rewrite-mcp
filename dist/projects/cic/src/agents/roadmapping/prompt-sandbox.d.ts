/**
 * prompt-sandbox.ts
 * ARPS Phase 22.1 — Prompt Sandbox
 * Enforces immutability, ownership, and drift thresholds for system prompts.
 */
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
export declare class PromptSandbox {
    private registryPath;
    private registry;
    private embeddingPipeline;
    constructor(registryPath: string);
    loadRegistry(): void;
    getRegistryEntries(): PromptRegistryEntry[];
    computeJaccard(textA: string, textB: string): number;
    checkSimilarity(oldText: string, newText: string, forceFallback?: boolean): Promise<{
        similarity: number;
        method: "cosine" | "jaccard";
    }>;
    validateChange(entry: PromptRegistryEntry, oldText: string, newText: string, options: {
        owner: string;
        forceFallback?: boolean;
    }): Promise<SandboxDecision>;
    check(promptId: string, newContent: string, options: {
        owner: string;
        forceFallback?: boolean;
    }): Promise<SandboxDecision>;
}
//# sourceMappingURL=prompt-sandbox.d.ts.map