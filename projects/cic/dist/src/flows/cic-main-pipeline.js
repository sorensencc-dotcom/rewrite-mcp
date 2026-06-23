/**
 * CIC Main Pipeline — The Canonical Documentary Flow
 *
 * This is CIC's primary reasoning loop:
 * 1. Validate environment (early safety)
 * 2. Ingest code context
 * 3. Analyze structures and call graphs
 * 4. Enrich with narratives and metadata
 * 5. Verify drift (spec ↔ implementation alignment)
 * 6. Auto-sync documentation
 * 7. Orchestrate handoff to downstream systems (Rewrite Labs, validation, etc.)
 *
 * MCP is integrated at three critical points:
 * - mcp-diagnostics: Pre-flight validation (ensures safe execution)
 * - mcp-drift: Post-enrichment verification (prevents garbage-in-garbage-out)
 * - mcp-docs-sync: Documentation sync (maintains audit trail)
 * - mcp-orchestrator: System handoff (routes to Rewrite Labs or next stage)
 *
 * This flow is:
 * - Deterministic: Same input always produces same output
 * - Observable: Every stage records spans with trace IDs
 * - Recoverable: Can resume from checkpoint after failure
 * - Auditable: Every decision recorded in docs + trace log
 */
export const cicMainPipeline = {
    id: "flow-cic-main-v1",
    version: "1.0.0",
    description: "CIC Main Pipeline: Ingest → Analyze → Enrich → Drift-Check → Sync → Orchestrate",
    status: "active",
    stages: [
        /**
         * STAGE 1: Pre-Flight Validation
         * Run environment diagnostics before starting expensive analysis.
         * Fail fast if Node, Docker, or required tools are missing.
         */
        {
            id: "stage-preflight",
            name: "Pre-Flight Environment Validation",
            type: "serial",
            agents: [
                {
                    agent: "mcp-diagnostics",
                    method: "diagnose",
                    input: {
                        checks: ["node", "typescript", "docker", "qdrant"],
                    },
                    timeout_ms: 20000,
                    retry: {
                        max_attempts: 1,
                        backoff: "linear",
                        initial_delay_ms: 1000,
                    },
                },
            ],
            on_error: "fail", // Stop immediately if environment is broken
        },
        /**
         * STAGE 2: Code Ingest & Analysis
         * Extract code structures, call graphs, and AST metadata.
         * Parallel execution: analyze code and extract call graph simultaneously.
         */
        {
            id: "stage-code-analysis",
            name: "Extract Code Structures & Dependencies",
            type: "parallel",
            agents: [
                {
                    agent: "code-analyzer",
                    method: "analyze",
                    input: {
                        context_id: "{{input.context_id}}",
                        include_metrics: true,
                        include_ast: true,
                    },
                    timeout_ms: 60000,
                    retry: {
                        max_attempts: 2,
                        backoff: "exponential",
                        initial_delay_ms: 500,
                    },
                },
                {
                    agent: "call-graph-extractor",
                    method: "extract",
                    input: {
                        context_id: "{{input.context_id}}",
                        depth: 3,
                    },
                    timeout_ms: 60000,
                    retry: {
                        max_attempts: 2,
                        backoff: "exponential",
                        initial_delay_ms: 500,
                    },
                },
            ],
            on_error: "fail",
        },
        /**
         * STAGE 3: Context Enrichment
         * Find related narratives, link to existing documentation,
         * synthesize enriched context.
         */
        {
            id: "stage-enrichment",
            name: "Enrich with Narratives & Metadata",
            type: "serial",
            agents: [
                {
                    agent: "narrative-linker",
                    method: "find_related_docs",
                    input: {
                        context_id: "{{input.context_id}}",
                        code_analysis: "{{stage-code-analysis.output['code-analyzer']}}",
                        call_graph: "{{stage-code-analysis.output['call-graph-extractor']}}",
                    },
                    timeout_ms: 45000,
                    retry: {
                        max_attempts: 2,
                        backoff: "linear",
                        initial_delay_ms: 1000,
                    },
                },
                {
                    agent: "context-synthesizer",
                    method: "merge",
                    input: {
                        context_id: "{{input.context_id}}",
                        code_analysis: "{{stage-code-analysis.output['code-analyzer']}}",
                        call_graph: "{{stage-code-analysis.output['call-graph-extractor']}}",
                        narratives: "{{stage-enrichment.output['narrative-linker']}}",
                    },
                    timeout_ms: 30000,
                },
            ],
            on_error: "fail",
        },
        /**
         * STAGE 4: Drift Detection & Verification
         * Critical checkpoint: Verify that the enriched context doesn't diverge
         * from the source specification. Prevents invalid downstream decisions.
         *
         * Input to mcp-drift:
         * - specPath: The original spec/README/requirements
         * - implPath: The synthesized enriched context
         *
         * If drift exceeds threshold, the flow continues but flags it.
         * Downstream stages (docs-sync, orchestrator) will see the flag.
         */
        {
            id: "stage-drift-verification",
            name: "Verify Enrichment Accuracy (Spec ↔ Synthesis)",
            type: "serial",
            agents: [
                {
                    agent: "mcp-drift",
                    method: "detectDrift",
                    input: {
                        specPath: "{{input.spec_path}}",
                        implPath: "{{stage-enrichment.output['context-synthesizer'].context_file}}",
                        threshold: 25,
                    },
                    timeout_ms: 15000,
                },
            ],
            on_error: "continue", // Continue even if drift detected; it's a warning, not fatal
        },
        /**
         * STAGE 5: Documentation Sync
         * Conditionally update CHANGELOG and roadmap based on enrichment success.
         * Only run if drift is acceptable (< threshold).
         *
         * This maintains an audit trail of what CIC discovered and synthesized.
         */
        {
            id: "stage-docs-update",
            name: "Auto-Sync Documentation (Conditional)",
            type: "serial",
            agents: [
                {
                    agent: "mcp-docs-sync",
                    method: "syncDocs",
                    input: {
                        changeType: "feature",
                        description: "CIC enrichment: {{input.context_id}} — {{stage-enrichment.output['context-synthesizer'].summary}}",
                        affectedFiles: [
                            "{{stage-enrichment.output['context-synthesizer'].context_file}}",
                        ],
                        roadmapSection: "## CIC Processing Log",
                    },
                    timeout_ms: 15000,
                },
            ],
            // Only sync if drift is acceptable
            if: "stage-drift-verification.output['mcp-drift'].exceedsThreshold === false",
            on_error: "continue", // Don't fail main flow if docs can't be synced
        },
        /**
         * STAGE 6: Orchestration & Handoff
         * Route enriched context to downstream systems:
         * - Rewrite Labs for code generation
         * - Validation systems for compliance checks
         * - Storage/archival for future reference
         *
         * The orchestrator is the exit point: CIC's work becomes input to other systems.
         */
        {
            id: "stage-orchestration",
            name: "Route to Downstream Systems",
            type: "serial",
            agents: [
                {
                    agent: "mcp-orchestrator",
                    method: "runTask",
                    input: {
                        taskId: "{{input.context_id}}-enrich-handoff",
                        owner: "cic",
                        taskType: "ingest",
                        input: {
                            enriched_context: "{{stage-enrichment.output['context-synthesizer']}}",
                            drift_check_passed: "{{stage-drift-verification.output['mcp-drift'].exceedsThreshold === false}}",
                            trace_id: "{{input.trace_id}}",
                            timestamp: "{{stage-enrichment.started_at}}",
                        },
                        correlationId: "{{input.context_id}}",
                    },
                    timeout_ms: 30000,
                    retry: {
                        max_attempts: 2,
                        backoff: "exponential",
                        initial_delay_ms: 1000,
                    },
                },
            ],
            on_error: "continue", // Handoff failure doesn't invalidate CIC's work
        },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: "cic-team",
};
//# sourceMappingURL=cic-main-pipeline.js.map