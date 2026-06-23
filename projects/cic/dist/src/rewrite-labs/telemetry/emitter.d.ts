/**
 * Redesign Session Event
 * Represents an end-to-end redesign session for an SMB site.
 */
export interface RedesignSessionEvent {
    session_id: string;
    project: string;
    smb_site_id: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    successful: boolean;
    reverted: boolean;
    abandoned: boolean;
    start_time: string;
    end_time: string;
    duration_seconds?: number;
}
/**
 * Stage Event
 * Per-stage metrics within a redesign session.
 */
export interface StageEvent {
    session_id: string;
    stage: "ANALYSIS" | "REDESIGN" | "VALIDATION" | "DEPLOYMENT";
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    model: string;
    provider: string;
    timestamp: string;
    retry_count?: number;
    duration_seconds?: number;
}
/**
 * Conversion Event
 * Tracks prospect conversion through outreach pipeline.
 */
export interface ConversionEvent {
    timestamp: string;
    session_id?: string;
    prospect_id: string;
    stage: "LEAD" | "QUALIFIED" | "CONTACTED" | "PROPOSAL_SENT" | "SIGNED" | "REJECTED" | "ABANDONED";
    outcome: "INITIATED" | "PROGRESSED" | "CONVERTED" | "LOST";
    value_usd?: number;
}
/**
 * Emit a redesign session event
 */
export declare function emitRedesignSession(event: RedesignSessionEvent): void;
/**
 * Emit a stage event
 */
export declare function emitStageEvent(event: StageEvent): void;
/**
 * Emit a conversion event
 */
export declare function emitConversionEvent(event: ConversionEvent): void;
/**
 * Helper to create a session event from stage telemetry
 */
export declare function createSessionEventFromStages(session_id: string, project: string, smb_site_id: string, stages: StageEvent[], status: {
    successful: boolean;
    reverted: boolean;
    abandoned: boolean;
}): RedesignSessionEvent;
