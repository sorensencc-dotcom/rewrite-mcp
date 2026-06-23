/**
 * File: RepoAnalysisBridge.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 *
 * Converts Repomix JSON output into CIC-native data structures.
 * Enables external repository analysis and Knowledge Graph enrichment.
 */
export interface RepomixFile {
    path: string;
    language: string;
    tokens: number;
    content: string;
}
export interface RepomixOutput {
    files: RepomixFile[];
    totalTokens: number;
}
export type ArchitecturePattern = "monolith" | "modular" | "microservices" | "unknown";
export interface CodePatternSignals {
    naming: string[];
    async: string[];
    testing: string[];
    errorHandling: string[];
    documentation: string[];
}
export interface ExternalRepositoryNode {
    id: string;
    repoId: string;
    architecture: ArchitecturePattern;
    dependencies: string[];
    patterns: CodePatternSignals;
    embeddingId: string | null;
    createdAt: string;
}
export declare class RepoAnalysisBridge {
    analyze(rep: RepomixOutput, repoId: string): Promise<ExternalRepositoryNode>;
    private detectArchitecture;
    private extractDependencies;
    private extractPatterns;
    private detectNamingConventions;
    private detectTestingFrameworks;
    private createEmbedding;
    private persistToKG;
    private linkSimilar;
}
