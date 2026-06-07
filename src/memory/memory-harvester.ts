/**
 * Phase 23.2 — Memory Harvester Agent
 * Collects events from ARPS, pipeline runs, agent telemetry, governance, APR plans, CRO runs, and social media extractions
 */

import { MemorySubstrate, MemoryEvent, EventType } from "./memory-substrate";
import { v4 as uuidv4 } from "uuid";

export interface HarvesterConfig {
  substrate: MemorySubstrate;
  session_id: string;
}

export class MemoryHarvester {
  private substrate: MemorySubstrate;
  private sessionId: string;

  constructor(config: HarvesterConfig) {
    this.substrate = config.substrate;
    this.sessionId = config.session_id;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Math.random().toString(16).slice(2, 8)}`;
  }

  /**
   * Record a roadmap delta (ARPS changes)
   */
  async harvestARPSDelta(payload: {
    change_type: "phase_completion" | "phase_creation" | "prompt_rewrite" | "instruction_update" | "priority_adjustment";
    phase_id?: string;
    old_value: string;
    new_value: string;
    git_commit: string;
    confidence: number;
    affected_subsystems: string[];
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "ARPS_DELTA",
      source_agent: "arps_synthesizer",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 90,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record a pipeline execution (ingestion, classification, etc.)
   */
  async harvestPipelineRun(payload: {
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
    failed_items?: Array<{ item_id: string; error: string; severity: string }>;
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "PIPELINE_RUN",
      source_agent: "pipeline_orchestrator",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 90,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record agent health and performance (from agent monitor)
   */
  async harvestAgentTelemetry(payload: {
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
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "AGENT_TELEMETRY",
      source_agent: "agent_monitor",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 90,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record governance decisions (approvals, rejections, escalations)
   */
  async harvestGovernanceSignal(payload: {
    signal_type: "approval" | "rejection" | "escalation" | "zone_violation" | "threshold_crossed" | "constraint_violation";
    entity_type: "skill" | "extraction" | "phase_write" | "cli_command";
    entity_id: string;
    decision: "approved" | "rejected" | "escalated";
    reason: string;
    operator?: string;
    approval_count: number;
    approval_threshold: number;
    metadata: Record<string, any>;
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "GOVERNANCE_SIGNAL",
      source_agent: "approval_handler",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 365,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record autonomous planning decisions (APR)
   */
  async harvestAPRPlan(payload: {
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
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "APR_PLAN",
      source_agent: "autonomous_planner",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 365,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record task execution (CRO)
   */
  async harvestCRORun(payload: {
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
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "CRO_RUN",
      source_agent: "runtime_orchestrator",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 90,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Record social media platform extraction (new for Phase 23.2)
   */
  async harvestPlatformExtraction(payload: {
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
  }): Promise<void> {
    const event: Omit<MemoryEvent, "checksum"> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event_type: "PLATFORM_EXTRACTION",
      source_agent: "social_media_orchestrator",
      session_id: this.sessionId,
      correlation_id: this.generateCorrelationId(),
      payload,
      retention_days: 90,
      version: 1,
    };

    await this.substrate.append(event);
  }

  /**
   * Batch ingest events (for integration with other systems)
   */
  async ingestBatch(events: Array<{
    event_type: EventType;
    payload: Record<string, any>;
    retention_days?: number;
    source_agent?: string;
  }>): Promise<number> {
    let count = 0;

    for (const item of events) {
      const event: Omit<MemoryEvent, "checksum"> = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        event_type: item.event_type,
        source_agent: item.source_agent || "unknown_source",
        session_id: this.sessionId,
        correlation_id: this.generateCorrelationId(),
        payload: item.payload,
        retention_days: item.retention_days || 90,
        version: 1,
      };

      try {
        await this.substrate.append(event);
        count++;
      } catch (err) {
        console.error(`Failed to ingest event: ${err}`);
      }
    }

    return count;
  }
}
