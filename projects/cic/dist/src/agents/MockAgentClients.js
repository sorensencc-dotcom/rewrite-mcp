/**
 * Mock Agent Clients for CIC Flow Execution
 * These implement the AgentClient interface for local testing
 * In production, these would be replaced with real agent implementations
 */
/**
 * Code Analyzer Mock
 * Simulates code structure analysis
 */
export class CodeAnalyzerAgent {
    async invoke(method, input, traceId) {
        console.log(`[code-analyzer.${method}] Analyzing context: ${input.context_id}`);
        if (method === "analyze") {
            return {
                structures: [
                    { type: "class", name: "ContextService", lines: 236 },
                    { type: "class", name: "FlowRegistry", lines: 300 },
                    { type: "interface", name: "AgentClient", lines: 10 },
                    { type: "function", name: "executeFlow", lines: 50 },
                ],
                patterns: ["dependency-injection", "event-emitter", "factory-pattern"],
                dependency_count: 15,
                complexity_score: 7.2,
                analyzed_files: 8,
            };
        }
        if (method === "classify_patterns") {
            return {
                patterns_found: ["async-handler", "retry-logic", "error-handling"],
                quality_score: 8.5,
                issues: ["some-long-functions", "missing-comments"],
            };
        }
        return { status: "success", method };
    }
}
/**
 * Call Graph Extractor Mock
 * Simulates call graph extraction
 */
export class CallGraphExtractorAgent {
    async invoke(method, input, traceId) {
        console.log(`[call-graph-extractor.${method}] Extracting from: ${input.context_id}`);
        if (method === "extract") {
            return {
                call_graph: {
                    nodes: 45,
                    edges: 120,
                    entry_points: ["executeFlow", "waitForExecution"],
                    cycles: 2,
                },
                control_flow: {
                    branches: 23,
                    loops: 5,
                    conditional_depth: 3,
                },
                hotspots: ["executeTask", "interpolateInput"],
            };
        }
        if (method === "analyze_flows") {
            return {
                flow_count: 2,
                max_depth: 3,
                avg_breadth: 2.1,
                critical_paths: ["extract → synthesize", "parse → classify"],
            };
        }
        return { status: "success", method };
    }
}
/**
 * Narrative Linker Mock
 * Simulates documentation linking
 */
export class NarrativeLinkerAgent {
    async invoke(method, input, traceId) {
        console.log(`[narrative-linker.${method}] Linking narratives for: ${input.context_id}`);
        if (method === "find_related_docs") {
            return {
                related_docs: [
                    { id: "doc-1", title: "CIC Architecture", relevance: 0.95 },
                    { id: "doc-2", title: "Flow Templates Guide", relevance: 0.87 },
                    { id: "doc-3", title: "Agent Registration", relevance: 0.72 },
                ],
                narrative_links: [
                    { source: "ContextService", target: "FlowRegistry", type: "uses" },
                    { source: "FlowOrchestrator", target: "AgentClient", type: "invokes" },
                ],
            };
        }
        return { status: "success", method };
    }
}
/**
 * Context Synthesizer Mock
 * Merges code and narrative contexts
 */
export class ContextSynthesizerAgent {
    async invoke(method, input, traceId) {
        console.log("[context-synthesizer] Synthesizing context");
        if (method === "merge") {
            return {
                unified_context: {
                    code_structures: {
                        classes: 15,
                        interfaces: 8,
                        functions: 40,
                    },
                    documentation: {
                        doc_count: 5,
                        coverage_percent: 85,
                    },
                    relationships: [
                        { type: "implements", count: 8 },
                        { type: "extends", count: 3 },
                        { type: "uses", count: 25 },
                    ],
                },
                metadata: {
                    synthesis_quality: 0.92,
                    coverage: 0.85,
                    completeness: 0.88,
                },
            };
        }
        return { status: "success", method };
    }
}
/**
 * Idea Parser Mock
 */
export class IdeaParserAgent {
    async invoke(method, input, traceId) {
        console.log(`[idea-parser] Parsing idea: ${input.idea_id}`);
        return {
            parsed_idea: {
                title: "Add distributed tracing to flow execution",
                description: "Implement OpenTelemetry integration for better observability",
                impact: "medium",
                effort: "high",
                tags: ["observability", "tracing", "infrastructure"],
            },
        };
    }
}
/**
 * Idea Classifier Mock
 */
export class IdeaClassifierAgent {
    async invoke(method, input, traceId) {
        console.log("[idea-classifier] Classifying idea");
        return {
            classification: {
                domain: "infrastructure",
                category: "observability",
                priority_level: "high",
            },
            score: 8.5,
            tags: ["observability", "tracing", "monitoring"],
            recommendation: "APPROVED",
        };
    }
}
/**
 * Refactor Proposal Engine Mock
 */
export class RefactorProposalEngine {
    async invoke(method, input, traceId) {
        console.log("[refactor-proposal-engine] Generating proposals");
        if (method === "propose") {
            return {
                proposals: [
                    {
                        id: "prop-1",
                        title: "Extract flow validation logic",
                        impact: "medium",
                        effort: "low",
                        risk: "low",
                    },
                    {
                        id: "prop-2",
                        title: "Implement flow versioning",
                        impact: "high",
                        effort: "medium",
                        risk: "medium",
                    },
                ],
                risk_assessment: {
                    overall_risk: "low",
                    breaking_changes: false,
                    migration_needed: false,
                },
            };
        }
        return { status: "success", method };
    }
}
/**
 * Test Generator Mock
 */
export class TestGeneratorAgent {
    async invoke(method, input, traceId) {
        console.log("[test-generator] Generating test cases");
        if (method === "generate_tests") {
            return {
                test_cases: [
                    { id: "test-1", name: "should execute simple flow", type: "unit" },
                    { id: "test-2", name: "should handle parallel stages", type: "unit" },
                    { id: "test-3", name: "should retry on failure", type: "integration" },
                ],
                coverage_report: {
                    statement_coverage: 92,
                    branch_coverage: 85,
                    function_coverage: 96,
                    line_coverage: 90,
                },
            };
        }
        return { status: "success", method };
    }
}
/**
 * Create all mock agents
 */
export function createMockAgents() {
    return {
        "code-analyzer": new CodeAnalyzerAgent(),
        "call-graph-extractor": new CallGraphExtractorAgent(),
        "narrative-linker": new NarrativeLinkerAgent(),
        "context-synthesizer": new ContextSynthesizerAgent(),
        "idea-parser": new IdeaParserAgent(),
        "idea-classifier": new IdeaClassifierAgent(),
        "refactor-proposal-engine": new RefactorProposalEngine(),
        "test-generator": new TestGeneratorAgent(),
    };
}
//# sourceMappingURL=MockAgentClients.js.map