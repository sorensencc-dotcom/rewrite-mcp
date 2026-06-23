/**
 * Real Agent Clients for CIC Flow Execution (Phase C)
 * These implement the AgentClient interface with actual code analysis and LLM integration
 */
import { AgentClient } from "../ruflo-orchestration/FlowOrchestrator";
/**
 * Real Code Analyzer Agent
 * Uses filesystem and basic parsing to analyze actual code
 */
export declare class RealCodeAnalyzerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private analyzeContext;
    private classifyPatterns;
    private findTypeScriptFiles;
    private detectPatterns;
}
/**
 * Real Call Graph Extractor Agent
 * Analyzes code to extract function call relationships
 */
export declare class RealCallGraphExtractorAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private extractCallGraph;
    private analyzeFlows;
}
/**
 * Real Narrative Linker Agent
 * Finds related documentation by searching the filesystem
 */
export declare class RealNarrativeLinkerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private findRelatedDocs;
    private findMarkdownFiles;
}
/**
 * Real Context Synthesizer Agent
 * Merges code and narrative contexts
 */
export declare class RealContextSynthesizerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private mergeContexts;
    private synthesizeContext;
}
/**
 * Real Idea Parser Agent
 * Parses and structures idea text
 */
export declare class RealIdeaParserAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private parseIdea;
    private extractMetadata;
    private estimateEffort;
    private extractTags;
}
/**
 * Real Idea Classifier Agent
 * Classifies ideas by domain, impact, and priority
 */
export declare class RealIdeaClassifierAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private classifyIdea;
    private scoreIdea;
    private calculateScore;
    private calculatePriority;
    private getRecommendation;
}
/**
 * Real Refactor Proposal Engine
 * Generates refactoring proposals based on code analysis
 */
export declare class RealRefactorProposalEngine implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private generateProposals;
    private suggestImprovements;
}
/**
 * Real Test Generator Agent
 * Generates test cases from code analysis
 */
export declare class RealTestGeneratorAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
    private generateTests;
    private analyzeCoverage;
}
/**
 * Create all real agents
 */
export declare function createRealAgents(): Record<string, AgentClient>;
//# sourceMappingURL=RealAgentClients.d.ts.map