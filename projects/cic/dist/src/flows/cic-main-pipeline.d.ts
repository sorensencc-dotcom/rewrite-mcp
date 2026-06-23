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
import { FlowTemplate } from "../ruflo-orchestration/FlowRegistry.js";
export declare const cicMainPipeline: FlowTemplate;
/**
 * Input shape for cic-main-v1
 *
 * Required:
 * - context_id: Unique identifier for this enrichment run
 * - spec_path: Path to specification/requirements document
 * - trace_id: Top-level trace ID for observability
 *
 * Optional:
 * - target_path: Specific file/directory to analyze (defaults to repo root)
 * - depth: Call graph depth (defaults to 3)
 * - include_metrics: Include code metrics (defaults to true)
 */
export type CICMainPipelineInput = {
    context_id: string;
    spec_path: string;
    trace_id: string;
    target_path?: string;
    depth?: number;
    include_metrics?: boolean;
};
/**
 * Output shape for cic-main-v1
 *
 * Contains:
 * - enriched_context: The synthesized, narrative-enriched code context
 * - drift_check: Whether enrichment stayed within bounds
 * - execution_id: Trace ID for querying observability
 * - downstream_status: Whether handoff to next system succeeded
 */
export type CICMainPipelineOutput = {
    stage_results: Record<string, Record<string, unknown>>;
    enriched_context: unknown;
    drift_acceptable: boolean;
    docs_synced: boolean;
    orchestration_complete: boolean;
    execution_trace_id: string;
};
