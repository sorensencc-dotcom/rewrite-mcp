/**
 * Mock Agent Clients for CIC Flow Execution
 * These implement the AgentClient interface for local testing
 * In production, these would be replaced with real agent implementations
 */
import { AgentClient } from "../ruflo-orchestration/FlowOrchestrator";
/**
 * Code Analyzer Mock
 * Simulates code structure analysis
 */
export declare class CodeAnalyzerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Call Graph Extractor Mock
 * Simulates call graph extraction
 */
export declare class CallGraphExtractorAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Narrative Linker Mock
 * Simulates documentation linking
 */
export declare class NarrativeLinkerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Context Synthesizer Mock
 * Merges code and narrative contexts
 */
export declare class ContextSynthesizerAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Idea Parser Mock
 */
export declare class IdeaParserAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Idea Classifier Mock
 */
export declare class IdeaClassifierAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Refactor Proposal Engine Mock
 */
export declare class RefactorProposalEngine implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Test Generator Mock
 */
export declare class TestGeneratorAgent implements AgentClient {
    invoke(method: string, input: Record<string, unknown>, traceId: string): Promise<Record<string, unknown>>;
}
/**
 * Create all mock agents
 */
export declare function createMockAgents(): Record<string, AgentClient>;
