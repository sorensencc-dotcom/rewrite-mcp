/**
 * Phase 23.2 — Memory Harvester Agent
 * Collects events from ARPS, pipeline runs, agent telemetry, governance, APR plans, CRO runs, and social media extractions
 */
import { MemorySubstrate, EventType } from "./memory-substrate";
export interface HarvesterConfig {
    substrate: MemorySubstrate;
    session_id: string;
}
export declare class MemoryHarvester {
    private substrate;
    private sessionId;
    constructor(config: HarvesterConfig);
    private generateEventId;
    private generateCorrelationId;
    /**
     * Record a roadmap delta (ARPS changes)
     */
    harvestARPSDelta(payload: {
        change_type: "phase_completion" | "phase_creation" | "prompt_rewrite" | "instruction_update" | "priority_adjustment";
        phase_id?: string;
        old_value: string;
        new_value: string;
        git_commit: string;
        confidence: number;
        affected_subsystems: string[];
    }): Promise<void>;
    /**
     * Record a pipeline execution (ingestion, classification, etc.)
     */
    harvestPipelineRun(payload: {
        pipeline_name: "ingestion" | "classification" | "archival" | "processing" | "reporting";
        pipeline_id: string;
        status: "success" | "partial" | "failed";
        start_time: string;
        end_time: string;
        duration_ms: number;
        items_processed: number;
        items_successful: number;
        items_failed: number;
        error_summary?: string;
        metrics: {
            throughput_items_per_second: number;
            error_rate_percent: number;
            resource_usage_mb: number;
        };
        failed_items?: Array<{
            item_id: string;
            error: string;
            severity: string;
        }>;
    }): Promise<void>;
    /**
     * Record agent health and performance (from agent monitor)
     */
    harvestAgentTelemetry(payload: {
        agent_name: string;
        agent_class: "ingestion" | "processing" | "reasoning" | "planning" | "execution";
        status: "healthy" | "degraded" | "failed";
        uptime_seconds: number;
        task_count: number;
        task_success_rate: number;
        last_error?: string;
        last_error_time?: string;
        performance: {
            avg_task_duration_ms: number;
            p95_task_duration_ms: number;
            cpu_usage_percent: number;
            memory_usage_mb: number;
            error_rate_percent: number;
        };
        degradation_reason?: string;
    }): Promise<void>;
    /**
     * Record governance decisions (approvals, rejections, escalations)
     */
    harvestGovernanceSignal(payload: {
        signal_type: "approval" | "rejection" | "escalation" | "zone_violation" | "threshold_crossed" | "constraint_violation";
        entity_type: "skill" | "extraction" | "phase_write" | "cli_command";
        entity_id: string;
        decision: "approved" | "rejected" | "escalated";
        reason: string;
        operator?: string;
        approval_count: number;
        approval_threshold: number;
        metadata: Record<string, any>;
    }): Promise<void>;
    /**
     * Record autonomous planning decisions (APR)
     */
    harvestAPRPlan(payload: {
        plan_id: string;
        goal: string;
        plan_type: "feature_development" | "bug_fix" | "optimization" | "governance";
        status: "generated" | "in_progress" | "completed" | "failed";
        task_count: number;
        task_graph: Array<{
            id: string;
            name: string;
            depends_on: string[];
            estimated_effort_hours: number;
        }>;
        critical_path_hours: number;
        risk_level: "low" | "medium" | "high";
        risk_factors: string[];
        agent_consensus_score: number;
        agents_involved: string[];
    }): Promise<void>;
    /**
     * Record task execution (CRO)
     */
    harvestCRORun(payload: {
        run_id: string;
        plan_id: string;
        status: "queued" | "running" | "completed" | "failed" | "rolled_back";
        start_time: string;
        end_time: string;
        duration_ms: number;
        step_count: number;
        step_results: Array<{
            step_id: string;
            task_id: string;
            agent_name: string;
            status: "success" | "failure";
            start_time: string;
            end_time: string;
            duration_ms: number;
            output_size_bytes: number;
            error?: string;
        }>;
        failure_info?: Record<string, any>;
        recovery_action?: string;
    }): Promise<void>;
    /**
     * Record social media platform extraction (new for Phase 23.2)
     */
    harvestPlatformExtraction(payload: {
        extraction_type: "profile" | "posts" | "comments" | "search" | "media_download";
        platform: string;
        query: string;
        api_endpoint_id: string;
        status: "success" | "partial" | "failed";
        start_time: string;
        end_time: string;
        duration_ms: number;
        items_requested: number;
        items_returned: number;
        items_normalized: number;
        normalization_errors: number;
        rate_limit_remaining: number;
        rate_limit_reset_seconds: number;
        error_summary?: string;
        error_detail?: string;
        confidence_score: number;
        data_quality_metrics: {
            schema_validation_pass_rate: number;
            missing_field_rate: number;
            anomaly_detection_flags: number;
        };
        documentary_context: {
            is_sorensen_harvest: boolean;
            sorensen_keywords_matched: string[];
            historical_relevance_score?: number;
        };
    }): Promise<void>;
    /**
     * Batch ingest events (for integration with other systems)
     */
    ingestBatch(events: Array<{
        event_type: EventType;
        payload: Record<string, any>;
        retention_days?: number;
        source_agent?: string;
    }>): Promise<number>;
}
//# sourceMappingURL=memory-harvester.d.ts.map